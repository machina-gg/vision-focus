// 書き込みはモジュール内の待ち行列で直列化する。background 以外から呼ぶと直列化が効かず加算が消える

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

let tail: Promise<void> = Promise.resolve();

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
      // 後続の処理を止めないためだけに握る（失敗は run で呼び出し元へ返す）
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

function isRecordable(event: ActivityEvent, tracked: Set<SiteKey>): boolean {
  if (!tracked.has(event.site)) return false;
  if (event.kind === 'stay') {
    return Number.isFinite(event.seconds) && event.seconds > 0;
  }
  return true;
}

/**
 * 出来事を発生したローカル日付・サイトの行へ加算する（追跡中でないサイトの出来事は捨てる）
 * @param events 記録する出来事（0 件なら何もしない。滞在秒数が正の有限数でない stay は捨てる）
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
    // 読み出した値は既定値の共有オブジェクトのことがあるので書き換えず、触る行だけ複製する
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
 * appendActivity と同じだが、失敗を投げずにログへ残す（本体の処理に付随して記録するときの入口）
 * @param events 記録する出来事
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
 * ホスト名で起きた出来事を追跡中のサイトへ引き直して記録する（同じサイトのホストは 1 件にまとめ、失敗は投げない）
 * @param hosts 出来事が起きたホスト名（追跡中のどのサイトにも属さないものは捨てる）
 * @param toEvent 引き直したサイトキーから記録する出来事を作る関数
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

/**
 * サイトの列をすべての日から消す（空になった日の行も消す）
 * @param site 消すサイトキー
 */
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

/**
 * date より前の日の行を消す（date 自身は残す）
 * @param date 残す最も古い日（ローカル日付の日付キー）
 */
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

/** 活動の記録をすべて消す */
export async function clearActivity(): Promise<void> {
  await enqueue(async () => {
    await activityItem.removeValue();
  });
}
