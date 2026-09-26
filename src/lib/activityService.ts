/**
 * ActivityService - 事実の表（`activity`）の唯一の書き手
 *
 * 事実を増やすのは `appendActivity` だけで、消すのも同じモジュールの関数だけにする。
 * 4 つの関数はすべて 1 本の待ち行列で直列化する。「読む → 足す → 書く」の間に
 * 別の書き込みが割り込むと、先に書いた側の加算が後から書いた側に上書きされて消えるため。
 *
 * ⚠ 待ち行列はこのモジュールの中にしかないので、background（Service Worker）以外から
 * 呼ぶと直列化が効かない。画面から書きたいときは background へメッセージで依頼する。
 */

import { activityItem } from '~/lib/storage';
import { getTrackedSiteKeys } from '~/lib/siteService';
import { resolveSiteKey } from '~/lib/siteKey';
import { objectOrFallback } from '~/lib/storedValue';
import { toDateKey } from '~/lib/time';
import type {
  ActivityEvent,
  ActivityLog,
  DailySiteActivity,
  DateKey
} from '~/types/activity';
import type { SiteKey } from '~/types/site';
import { DEFAULT_ACTIVITY } from '~/types/storage';

/** 直前に積まれた処理の完了を表す。失敗しても後続を止めないよう、ここは常に解決する */
let tail: Promise<void> = Promise.resolve();

/** 処理を待ち行列の末尾に積み、前の処理がすべて終わってから実行する */
async function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const previous = tail;
  const run = (async () => {
    await previous;
    return await task();
  })();
  tail = (async () => {
    try {
      await run;
    } catch {
      // 失敗は呼び出し元へ run で返す。ここで握るのは後続の処理を止めないためだけ
    }
  })();
  return await run;
}

async function readLog(): Promise<ActivityLog> {
  return objectOrFallback(await activityItem.getValue(), DEFAULT_ACTIVITY);
}

const EMPTY_ACTIVITY: DailySiteActivity = {
  seconds: 0,
  blocks: 0,
  unblocks: 0
};

/** 出来事 1 件ぶんを 1 日・1 サイトの値に足す */
function applyEvent(
  current: DailySiteActivity,
  event: ActivityEvent
): DailySiteActivity {
  switch (event.kind) {
    case 'stay':
      return { ...current, seconds: current.seconds + event.seconds };
    case 'block':
      return { ...current, blocks: current.blocks + 1 };
    case 'unblock':
      return { ...current, unblocks: current.unblocks + 1 };
  }
}

/** 記録してよい出来事か。滞在は正の有限な秒数でなければ事実を壊すので捨てる */
function isRecordable(event: ActivityEvent, tracked: Set<SiteKey>): boolean {
  if (!tracked.has(event.site)) return false;
  if (event.kind === 'stay') {
    return Number.isFinite(event.seconds) && event.seconds > 0;
  }
  return true;
}

/**
 * 出来事を `at` のローカル日付の行・`site` の列へ加算する。事実を増やすのはこの関数だけ。
 * 追跡中のサイトに無いキーの出来事は捨てる（記録対象は追跡中のサイトに限る）。
 * `site` はサイトキーで渡す（ホスト名からの引き直しは呼び出し側の `resolveSiteKey`）
 */
export async function appendActivity(
  ...events: ActivityEvent[]
): Promise<void> {
  if (events.length === 0) return;

  await enqueue(async () => {
    const tracked = new Set(await getTrackedSiteKeys());
    const recordable = events.filter((event) => isRecordable(event, tracked));
    if (recordable.length === 0) return;

    const log = await readLog();
    // 読み出した値（既定値の共有オブジェクトを含む）は書き換えず、触る行だけ複製する
    const next: ActivityLog = { ...log };
    for (const event of recordable) {
      const date = toDateKey(event.at);
      const row = { ...next[date] };
      row[event.site] = applyEvent(row[event.site] ?? EMPTY_ACTIVITY, event);
      next[date] = row;
    }
    await activityItem.setValue(next);
  });
}

/**
 * 本体の処理（設定の保存・タブのリダイレクト・旧データの記録）に付随して事実を記録する入口。
 * 記録の失敗で本体の処理を止めないよう、失敗はここで受け止めてログに残す
 * （握りつぶすと「起きなかった」と「記録できていない」が区別できなくなる）。
 * background のハンドラ・リスナーはこちらを呼ぶ
 */
export async function recordActivity(
  ...events: ActivityEvent[]
): Promise<void> {
  try {
    await appendActivity(...events);
  } catch (error) {
    console.error('Failed to record activity', error);
  }
}

/**
 * ホスト名で起きた出来事を、追跡中のサイトへ引き直して記録する（失敗の扱いは `recordActivity` と同じ）。
 * 同じサイトに属するホスト（www. 付きと m. 付きなど）は 1 件にまとめてから `toEvent` に渡す。
 * 同時に表示されていた別ホストの滞在を 1 回分として数えるため。
 * どの追跡中のサイトにも属さないホストは記録しない
 */
export async function recordHostActivity(
  hosts: readonly string[],
  toEvent: (site: SiteKey) => ActivityEvent
): Promise<void> {
  if (hosts.length === 0) return;

  try {
    const tracked = await getTrackedSiteKeys();
    const sites = new Set<SiteKey>();
    for (const host of hosts) {
      const site = resolveSiteKey(host, tracked);
      if (site) sites.add(site);
    }
    if (sites.size === 0) return;

    await appendActivity(...[...sites].map(toEvent));
  } catch (error) {
    console.error('Failed to record activity', error);
  }
}

/** 追跡を止めたサイトの列をすべての日から消す。空になった日の行も消す */
export async function purgeSite(site: SiteKey): Promise<void> {
  await enqueue(async () => {
    const log = await readLog();
    const next: ActivityLog = {};
    let changed = false;
    for (const [date, row] of Object.entries(log)) {
      if (!(site in row)) {
        next[date] = row;
        continue;
      }
      changed = true;
      const rest = { ...row };
      delete rest[site];
      if (Object.keys(rest).length > 0) next[date] = rest;
    }
    if (changed) await activityItem.setValue(next);
  });
}

/** `date` より前（`date` 自身は残す）の日の行を消す。保持期間の切り捨てに使う */
export async function pruneBefore(date: DateKey): Promise<void> {
  await enqueue(async () => {
    const log = await readLog();
    const next: ActivityLog = {};
    for (const [key, row] of Object.entries(log)) {
      // DateKey は YYYY-MM-DD 固定長なので文字列比較が日付順になる
      if (key >= date) next[key] = row;
    }
    if (Object.keys(next).length !== Object.keys(log).length) {
      await activityItem.setValue(next);
    }
  });
}

/** 事実をすべて消す（分析データのリセット。今日の分も消える） */
export async function clearActivity(): Promise<void> {
  await enqueue(async () => {
    await activityItem.removeValue();
  });
}
