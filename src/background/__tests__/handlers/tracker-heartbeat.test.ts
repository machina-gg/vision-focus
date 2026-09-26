import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { invoke } from './helpers';

/**
 * 事実の表（activity）はインメモリの実体に差し替え、書き手（activityService）は実物を通す。
 * 書き手は追跡中の集合に無いキーを捨てるので、呼び出しの有無ではなく保存された値を見る
 */
const activityStore = vi.hoisted(() => ({ value: undefined as unknown }));

vi.mock('~/lib/storage', () => ({
  getSettings: vi.fn(),
  getSites: vi.fn(),
  activityItem: {
    getValue: vi.fn(async () => structuredClone(activityStore.value ?? {})),
    setValue: vi.fn(async (value: unknown) => {
      activityStore.value = structuredClone(value);
    }),
    removeValue: vi.fn()
  }
}));

vi.mock('../../notifications', () => ({
  checkTimeLimitNotification: vi.fn()
}));

vi.mock('../../blocker', () => ({
  updateBlockRules: vi.fn(),
  blockExistingTabs: vi.fn()
}));

vi.mock('~/lib/siteService', () => ({
  getTrackedSiteKeys: vi.fn()
}));

import { getSettings, getSites } from '~/lib/storage';
import { checkTimeLimitNotification } from '../../notifications';
import { updateBlockRules, blockExistingTabs } from '../../blocker';
import { getTrackedSiteKeys } from '~/lib/siteService';
import { toDateKey } from '~/lib/time';
import type { ActivityLog } from '~/types/activity';
import { DEFAULT_SETTINGS } from '~/types/storage';
import type { AppSettings } from '~/types/storage';
import type { BlockRule, TrackedSite } from '~/types/site';
import { blockedSite, sitesOf } from '~/test/sites';
import { TRACKER_CONFIG } from '~/constants/limits';

interface Response {
  success: boolean;
  error?: string;
}

/**
 * ハンドラはモジュールレベルに activePages / recordingTimer の状態を持つため、
 * テストごとに resetModules して読み込み直す。
 */
async function loadHandler() {
  vi.resetModules();
  const mod = await import('../../handlers/tracker-heartbeat');
  return mod.trackerHeartbeatHandler;
}

const RECORDED_SECONDS = Math.floor(
  TRACKER_CONFIG.RECORDING_INTERVAL_MS / 1000
);

/** 全体の設定と追跡中のサイトを差し替える */
function given(sites: TrackedSite[], settings: Partial<AppSettings> = {}) {
  vi.mocked(getSettings).mockResolvedValue({
    ...DEFAULT_SETTINGS,
    ...settings
  });
  vi.mocked(getSites).mockResolvedValue(sitesOf(...sites));
}

/** youtube.com のブロック設定を差し替える（null = ブロックしない） */
function givenYouTubeBlock(block: Partial<BlockRule> | null) {
  given(block ? [blockedSite('youtube.com', block)] : []);
}

const LIMIT_SECONDS = 1800;

/** example.com を時間制限つきでブロックリストに入れ、追跡中にする */
function givenTimeLimitedExample(overrides: Partial<AppSettings> = {}) {
  given(
    [
      blockedSite('example.com', {
        timeLimit: { type: 'daily', limitSeconds: LIMIT_SECONDS }
      })
    ],
    overrides
  );
  vi.mocked(getTrackedSiteKeys).mockResolvedValue(['example.com']);
}

/** 今日（ローカル日付）の行にサイトの滞在秒数を入れておく */
function givenTodaySeconds(site: string, seconds: number) {
  const log: ActivityLog = {
    [toDateKey(new Date())]: { [site]: { seconds, blocks: 0, unblocks: 0 } }
  };
  activityStore.value = log;
}

describe('tracker-heartbeat ハンドラ', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getTrackedSiteKeys).mockResolvedValue([]);
    activityStore.value = undefined;
    givenYouTubeBlock({ timeLimit: { type: 'daily', limitSeconds: 60 } });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('入力検証', () => {
    it.each([
      ['url が空文字', { url: '', status: 'active' }],
      ['status が不正', { url: 'https://example.com', status: 'unknown' }],
      ['status が無い', { url: 'https://example.com' }],
      [
        'url が 2048 文字超',
        { url: `https://example.com/${'a'.repeat(2048)}`, status: 'active' }
      ],
      [
        'timestamp が負数',
        { url: 'https://example.com', status: 'active', timestamp: -1 }
      ]
    ])('%s なら Invalid request body を返す', async (_label, body) => {
      const handler = await loadHandler();

      const result = await invoke<Response>(handler, body);

      expect(result).toEqual({
        success: false,
        error: 'Invalid request body'
      });
    });

    it('ドメインを抽出できない URL なら Invalid URL を返す', async () => {
      const handler = await loadHandler();

      const result = await invoke<Response>(handler, {
        url: 'not-a-url',
        status: 'active'
      });

      expect(result).toEqual({ success: false, error: 'Invalid URL' });
    });
  });

  describe('ステータス処理', () => {
    it('active を受け付ける', async () => {
      const handler = await loadHandler();

      const result = await invoke<Response>(handler, {
        url: 'https://example.com/page',
        status: 'active',
        timestamp: 1000
      });

      expect(result).toEqual({ success: true });
    });

    it('heartbeat を受け付ける', async () => {
      const handler = await loadHandler();

      const result = await invoke<Response>(handler, {
        url: 'https://example.com',
        status: 'heartbeat'
      });

      expect(result).toEqual({ success: true });
    });

    it('未知のページに対する inactive でも成功を返す', async () => {
      const handler = await loadHandler();

      const result = await invoke<Response>(handler, {
        url: 'https://example.com',
        status: 'inactive'
      });

      expect(result).toEqual({ success: true });
    });

    it('timestamp 省略時も受け付ける', async () => {
      const handler = await loadHandler();

      const result = await invoke<Response>(handler, {
        url: 'https://example.com',
        status: 'heartbeat'
      });

      expect(result).toEqual({ success: true });
    });
  });

  describe('計測タイマー', () => {
    it('active 後、記録間隔ごとに時間を計測する', async () => {
      vi.useFakeTimers();
      vi.mocked(getTrackedSiteKeys).mockResolvedValue(['example.com']);
      const handler = await loadHandler();

      await invoke(handler, {
        url: 'https://example.com',
        status: 'active',
        timestamp: Date.now()
      });

      await vi.advanceTimersByTimeAsync(TRACKER_CONFIG.RECORDING_INTERVAL_MS);

      expect(getTrackedSiteKeys).toHaveBeenCalled();
    });

    it('inactive にすると計測されなくなる', async () => {
      vi.useFakeTimers();
      const handler = await loadHandler();

      await invoke(handler, {
        url: 'https://example.com',
        status: 'active',
        timestamp: Date.now()
      });
      await invoke(handler, {
        url: 'https://example.com',
        status: 'inactive'
      });

      await vi.advanceTimersByTimeAsync(TRACKER_CONFIG.RECORDING_INTERVAL_MS);

      expect(getTrackedSiteKeys).not.toHaveBeenCalled();
    });

    it('ハートビートが途絶えると計測を止める', async () => {
      vi.useFakeTimers();
      const handler = await loadHandler();

      await invoke(handler, {
        url: 'https://example.com',
        status: 'active',
        timestamp: Date.now()
      });

      // ハートビートのタイムアウトを超えて放置する
      await vi.advanceTimersByTimeAsync(
        TRACKER_CONFIG.HEARTBEAT_TIMEOUT_MS +
          TRACKER_CONFIG.RECORDING_INTERVAL_MS
      );
      vi.mocked(getTrackedSiteKeys).mockClear();

      await vi.advanceTimersByTimeAsync(TRACKER_CONFIG.RECORDING_INTERVAL_MS);

      expect(getTrackedSiteKeys).not.toHaveBeenCalled();
    });
  });

  describe('時間制限の適用（使用量は activity の今日の行）', () => {
    async function showExampleFor(intervals = 1) {
      const handler = await loadHandler();
      await invoke(handler, {
        url: 'https://www.example.com/page',
        status: 'active',
        timestamp: Date.now()
      });
      await vi.advanceTimersByTimeAsync(
        TRACKER_CONFIG.RECORDING_INTERVAL_MS * intervals
      );
    }

    it('記録した滞在を含めた残り時間で通知を確認する', async () => {
      vi.useFakeTimers();
      givenTimeLimitedExample();
      givenTodaySeconds('example.com', 100);

      await showExampleFor();

      // www. 付きのホストでもサイトキーで引く
      expect(checkTimeLimitNotification).toHaveBeenCalledWith({
        site: 'example.com',
        rule: {
          enabled: true,
          timeLimit: { type: 'daily', limitSeconds: LIMIT_SECONDS }
        },
        state: {
          blocked: false,
          reason: null,
          remainingSeconds: LIMIT_SECONDS - 100 - RECORDED_SECONDS
        }
      });
      expect(updateBlockRules).not.toHaveBeenCalled();
    });

    it('この記録で上限に達したら、その場でルールを更新し開いているタブもブロックする', async () => {
      vi.useFakeTimers();
      givenTimeLimitedExample();
      givenTodaySeconds('example.com', LIMIT_SECONDS - RECORDED_SECONDS);

      await showExampleFor();

      expect(updateBlockRules).toHaveBeenCalledOnce();
      expect(blockExistingTabs).toHaveBeenCalledOnce();
    });

    it('前日の使用量は数えない', async () => {
      vi.useFakeTimers();
      givenTimeLimitedExample();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      activityStore.value = {
        [toDateKey(yesterday)]: {
          'example.com': { seconds: LIMIT_SECONDS * 2, blocks: 0, unblocks: 0 }
        }
      } satisfies ActivityLog;

      await showExampleFor();

      expect(updateBlockRules).not.toHaveBeenCalled();
    });

    it('一時停止中は上限を超えていても適用しない', async () => {
      vi.useFakeTimers();
      givenTimeLimitedExample({ paused: true });
      givenTodaySeconds('example.com', LIMIT_SECONDS * 2);

      await showExampleFor();

      expect(updateBlockRules).not.toHaveBeenCalled();
      expect(blockExistingTabs).not.toHaveBeenCalled();
    });

    it('常時ブロックの項目は通知もルール更新もしない', async () => {
      vi.useFakeTimers();
      givenTimeLimitedExample();
      given([blockedSite('example.com')]);

      await showExampleFor();

      expect(checkTimeLimitNotification).not.toHaveBeenCalled();
      expect(updateBlockRules).not.toHaveBeenCalled();
    });
  });

  describe('YouTube の時間制限', () => {
    async function showYouTube() {
      const handler = await loadHandler();
      await invoke(handler, {
        url: 'https://www.youtube.com/watch?v=abc',
        status: 'active',
        timestamp: Date.now()
      });
      await vi.advanceTimersByTimeAsync(TRACKER_CONFIG.RECORDING_INTERVAL_MS);
    }

    beforeEach(() => {
      vi.mocked(getTrackedSiteKeys).mockResolvedValue(['youtube.com']);
    });

    it('上限に達したら他のサイトと同じくルールを更新し開いているタブもブロックする', async () => {
      vi.useFakeTimers();
      givenTodaySeconds('youtube.com', 60);

      await showYouTube();

      expect(checkTimeLimitNotification).toHaveBeenCalledWith(
        expect.objectContaining({ site: 'youtube.com' })
      );
      expect(updateBlockRules).toHaveBeenCalled();
      expect(blockExistingTabs).toHaveBeenCalled();
    });

    it('上限未満ならブロックルールを再適用しない', async () => {
      vi.useFakeTimers();

      await showYouTube();

      expect(updateBlockRules).not.toHaveBeenCalled();
      expect(blockExistingTabs).not.toHaveBeenCalled();
    });

    it('アクセスブロックしない（ブロック設定なし）なら上限を超えても通知もルール更新もしない', async () => {
      // 超過してもブロックされない設定なので、記録間隔ごとの
      // ルール再構築と全タブ走査を繰り返さない
      vi.useFakeTimers();
      givenYouTubeBlock(null);
      givenTodaySeconds('youtube.com', 600);

      await showYouTube();

      expect(checkTimeLimitNotification).not.toHaveBeenCalled();
      expect(updateBlockRules).not.toHaveBeenCalled();
      expect(blockExistingTabs).not.toHaveBeenCalled();
    });
  });

  describe('事実の表（activity）への滞在の記録', () => {
    /** 今日の行に記録された滞在秒数（サイトごと）。記録が無ければ空 */
    function todaySeconds(): Record<string, number> {
      const log = (activityStore.value ?? {}) as ActivityLog;
      const row = log[toDateKey(new Date())] ?? {};
      return Object.fromEntries(
        Object.entries(row).map(([site, activity]) => [site, activity.seconds])
      );
    }

    async function showPages(urls: string[]) {
      const handler = await loadHandler();
      for (const url of urls) {
        await invoke(handler, { url, status: 'active', timestamp: Date.now() });
      }
      return handler;
    }

    it('追跡中のサイトを表示している間、記録間隔ごとに滞在を記録する', async () => {
      vi.useFakeTimers();
      vi.mocked(getTrackedSiteKeys).mockResolvedValue(['example.com']);
      await showPages(['https://example.com/page']);

      await vi.advanceTimersByTimeAsync(
        TRACKER_CONFIG.RECORDING_INTERVAL_MS * 2
      );

      expect(todaySeconds()).toEqual({ 'example.com': RECORDED_SECONDS * 2 });
    });

    it('解除中かどうかでは絞らない（ブロック中の追跡サイトも記録する）', async () => {
      vi.useFakeTimers();
      given([blockedSite('example.com')]);
      vi.mocked(getTrackedSiteKeys).mockResolvedValue(['example.com']);
      await showPages(['https://example.com']);

      await vi.advanceTimersByTimeAsync(TRACKER_CONFIG.RECORDING_INTERVAL_MS);

      expect(todaySeconds()).toEqual({ 'example.com': RECORDED_SECONDS });
    });

    it('同じサイトを別ホストで同時に表示していても 1 回分にする', async () => {
      vi.useFakeTimers();
      vi.mocked(getTrackedSiteKeys).mockResolvedValue(['youtube.com']);
      await showPages([
        'https://www.youtube.com/watch?v=a',
        'https://m.youtube.com/watch?v=b',
        'https://youtube.com/'
      ]);

      await vi.advanceTimersByTimeAsync(TRACKER_CONFIG.RECORDING_INTERVAL_MS);

      expect(todaySeconds()).toEqual({ 'youtube.com': RECORDED_SECONDS });
    });

    it('別々のサイトを同時に表示していれば、それぞれ 1 回分を記録する', async () => {
      vi.useFakeTimers();
      vi.mocked(getTrackedSiteKeys).mockResolvedValue(['youtube.com', 'x.com']);
      await showPages(['https://www.youtube.com/', 'https://x.com/home']);

      await vi.advanceTimersByTimeAsync(TRACKER_CONFIG.RECORDING_INTERVAL_MS);

      expect(todaySeconds()).toEqual({
        'youtube.com': RECORDED_SECONDS,
        'x.com': RECORDED_SECONDS
      });
    });

    it('追跡中のサイトに属さないページは記録しない', async () => {
      vi.useFakeTimers();
      vi.mocked(getTrackedSiteKeys).mockResolvedValue(['youtube.com']);
      await showPages(['https://example.com/']);

      await vi.advanceTimersByTimeAsync(TRACKER_CONFIG.RECORDING_INTERVAL_MS);

      expect(activityStore.value).toBeUndefined();
    });

    it('表示されなくなったページは記録しない', async () => {
      vi.useFakeTimers();
      vi.mocked(getTrackedSiteKeys).mockResolvedValue(['example.com']);
      const handler = await showPages(['https://example.com/']);
      await invoke(handler, {
        url: 'https://example.com/',
        status: 'inactive'
      });

      await vi.advanceTimersByTimeAsync(TRACKER_CONFIG.RECORDING_INTERVAL_MS);

      expect(getTrackedSiteKeys).not.toHaveBeenCalled();
      expect(activityStore.value).toBeUndefined();
    });

    it('記録に失敗しても次の記録間隔の計測は続く', async () => {
      vi.useFakeTimers();
      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);
      vi.mocked(getTrackedSiteKeys)
        .mockRejectedValueOnce(new Error('読み出し失敗'))
        .mockResolvedValue(['example.com']);
      await showPages(['https://example.com/']);

      await vi.advanceTimersByTimeAsync(
        TRACKER_CONFIG.RECORDING_INTERVAL_MS * 2
      );

      expect(consoleError).toHaveBeenCalledOnce();
      expect(todaySeconds()).toEqual({ 'example.com': RECORDED_SECONDS });
      consoleError.mockRestore();
    });
  });
});
