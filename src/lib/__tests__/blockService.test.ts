import { describe, expect, it, vi, beforeEach } from 'vitest';

// storage モジュールをモック（事実の表はテストごとに差し替える）
vi.mock('~/lib/storage', () => ({
  getSettings: vi.fn(),
  activityItem: { getValue: vi.fn() }
}));

// スケジュールの内外だけを差し替え、日付キー（toDateKey）は実物を使う
vi.mock('~/lib/time', async (importOriginal) => ({
  ...(await importOriginal<typeof import('~/lib/time')>()),
  isWithinSchedule: vi.fn()
}));

import { getSettings, activityItem } from '~/lib/storage';
import { isWithinSchedule, toDateKey } from '~/lib/time';
import {
  isAnyScheduleActive,
  isBlockingWindowOpen,
  getBlockState,
  getBlockStateForDomain,
  getSiteBlockStatus,
  getSiteBlockStatuses,
  shouldBlockUrl,
  shouldTrackBlockForDomain,
  getActiveBlockedDomains
} from '~/lib/blockService';
import { YOUTUBE_DOMAIN } from '~/lib/youtubeBlockService';
import type {
  AppSettings,
  BlockItem,
  Schedule,
  YouTubeSettings
} from '~/types/storage';
import type { ActivityLog } from '~/types/activity';
import { DEFAULT_SETTINGS, DEFAULT_YOUTUBE_SETTINGS } from '~/types/storage';

const mockGetSettings = vi.mocked(getSettings);
const mockGetActivity = vi.mocked(activityItem.getValue);
const mockIsWithinSchedule = vi.mocked(isWithinSchedule);

const LIMIT_SECONDS = 1800;

beforeEach(() => {
  vi.clearAllMocks();
  mockIsWithinSchedule.mockReturnValue(true);
  mockGetActivity.mockResolvedValue({});
});

// テスト用の設定を生成して保存値にする
function givenSettings(overrides: Partial<AppSettings> = {}): void {
  mockGetSettings.mockResolvedValue({ ...DEFAULT_SETTINGS, ...overrides });
}

function item(overrides: Partial<BlockItem> = {}): BlockItem {
  return {
    id: '1',
    domain: 'example.com',
    isWildcard: false,
    createdAt: '2024-01-01T00:00:00Z',
    enabled: true,
    timeLimit: null,
    ...overrides
  };
}

function limitedItem(overrides: Partial<BlockItem> = {}): BlockItem {
  return item({
    timeLimit: { type: 'daily', limitSeconds: LIMIT_SECONDS },
    ...overrides
  });
}

// アクセスブロックを有効にした YouTube 設定を生成
function youtubeSettings(
  overrides: Partial<YouTubeSettings> = {}
): YouTubeSettings {
  return {
    ...DEFAULT_YOUTUBE_SETTINGS,
    enabled: true,
    blockAccess: true,
    ...overrides
  };
}

/** 指定日の行にサイトごとの表示秒数を入れる（既定は今日のローカル日付） */
function givenSeconds(
  seconds: Record<string, number>,
  date: Date = new Date()
): void {
  const row = Object.fromEntries(
    Object.entries(seconds).map(([site, s]) => [
      site,
      { seconds: s, blocks: 0, unblocks: 0 }
    ])
  );
  const log: ActivityLog = { [toDateKey(date)]: row };
  mockGetActivity.mockResolvedValue(log);
}

// スケジュール外を再現するための、常に「有効だが時間外」のスケジュール
const OUT_OF_SCHEDULE: Schedule[] = [
  {
    id: 's1',
    name: 'Work',
    startTime: '09:00',
    endTime: '17:00',
    days: [1],
    enabled: true
  }
];

function schedule(overrides: Partial<Schedule> = {}): Schedule {
  return {
    id: 's1',
    name: 'Test',
    startTime: '09:00',
    endTime: '17:00',
    days: [1, 2, 3, 4, 5],
    enabled: true,
    ...overrides
  };
}

describe('isAnyScheduleActive（有効かつ範囲内のスケジュールがあるか）', () => {
  it.each([
    ['未設定', undefined, true, false],
    ['空', [], true, false],
    ['有効で範囲内', [schedule()], true, true],
    ['無効（範囲内でも）', [schedule({ enabled: false })], true, false],
    ['有効で範囲外', [schedule()], false, false]
  ] satisfies [string, Schedule[] | undefined, boolean, boolean][])(
    '%s',
    (_label, schedules, within, expected) => {
      mockIsWithinSchedule.mockReturnValue(within);
      expect(isAnyScheduleActive(schedules)).toBe(expected);
    }
  );
});

describe('isBlockingWindowOpen（ブロックが効く時間帯か）', () => {
  it.each([
    // 設定が欠けているとブロックルールの再計算が丸ごと止まるため、ここで落ちないことを保証する
    ['未設定なら常に効く', undefined, false, true],
    ['スケジュールが無ければ常に効く', [], false, true],
    [
      'すべて無効なら「スケジュール無し」と同じく常に効く',
      [schedule({ enabled: false }), schedule({ id: 's2', enabled: false })],
      false,
      true
    ],
    ['有効なスケジュールの範囲内なら効く', [schedule()], true, true],
    [
      '有効なスケジュールの範囲外なら効かない（無効なものは数えない）',
      [schedule(), schedule({ id: 's2', enabled: false })],
      false,
      false
    ]
  ] satisfies [string, Schedule[] | undefined, boolean, boolean][])(
    '%s',
    (_label, schedules, within, expected) => {
      mockIsWithinSchedule.mockReturnValue(within);
      expect(isBlockingWindowOpen(schedules)).toBe(expected);
    }
  );

  it('全部無効のスケジュールがあっても常時ブロックの項目はブロックする', async () => {
    mockIsWithinSchedule.mockReturnValue(false);
    givenSettings({
      blockList: [item()],
      schedules: [schedule({ enabled: false })]
    });

    expect(await getBlockState('https://example.com')).toEqual({
      blocked: true,
      reason: 'always_blocked'
    });
    expect(await getActiveBlockedDomains()).toEqual(['example.com']);
  });
});

describe('getBlockState', () => {
  it('無効なURLではブロックしない', async () => {
    const result = await getBlockState('');
    expect(result).toEqual({ blocked: false, reason: null });
  });

  it('一時停止中はブロックしない', async () => {
    givenSettings({ paused: true, blockList: [item()] });
    const result = await getBlockState('https://example.com');
    expect(result).toEqual({ blocked: false, reason: null });
  });

  it('ブロックリストにないURLはブロックしない', async () => {
    givenSettings({ blockList: [item()] });
    const result = await getBlockState('https://google.com');
    expect(result).toEqual({ blocked: false, reason: null });
  });

  it('無効化されたアイテムはブロックしない', async () => {
    givenSettings({ blockList: [item({ enabled: false })] });
    const result = await getBlockState('https://example.com');
    expect(result).toEqual({ blocked: false, reason: null });
  });

  it('スケジュール外では常時ブロックの項目もブロックしない', async () => {
    mockIsWithinSchedule.mockReturnValue(false);
    givenSettings({ blockList: [item()], schedules: OUT_OF_SCHEDULE });
    const result = await getBlockState('https://example.com');
    expect(result).toEqual({ blocked: false, reason: null });
  });

  it('スケジュール外では上限を超えていてもブロックせず、残り時間も返さない', async () => {
    mockIsWithinSchedule.mockReturnValue(false);
    givenSettings({ blockList: [limitedItem()], schedules: OUT_OF_SCHEDULE });
    givenSeconds({ 'example.com': LIMIT_SECONDS * 2 });
    const result = await getBlockState('https://example.com');
    expect(result).toEqual({ blocked: false, reason: null });
  });

  it('タイムリミットなしの場合は常にブロック', async () => {
    givenSettings({ blockList: [item()] });
    const result = await getBlockState('https://example.com');
    expect(result).toEqual({ blocked: true, reason: 'always_blocked' });
  });

  it('今日の表示秒数が上限に達したらブロック', async () => {
    givenSettings({ blockList: [limitedItem()] });
    givenSeconds({ 'example.com': LIMIT_SECONDS });
    const result = await getBlockState('https://example.com');
    expect(result).toEqual({
      blocked: true,
      reason: 'time_limit_exceeded',
      remainingSeconds: 0
    });
  });

  it('上限未満ならブロックせず残り時間を返す', async () => {
    givenSettings({ blockList: [limitedItem()] });
    givenSeconds({ 'example.com': 600 });
    const result = await getBlockState('https://example.com');
    expect(result).toEqual({
      blocked: false,
      reason: null,
      remainingSeconds: LIMIT_SECONDS - 600
    });
  });

  it('前日（ローカル日付）の行は今日の使用量に数えない', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    givenSettings({ blockList: [limitedItem()] });
    givenSeconds({ 'example.com': LIMIT_SECONDS * 2 }, yesterday);
    const result = await getBlockState('https://example.com');
    expect(result).toEqual({
      blocked: false,
      reason: null,
      remainingSeconds: LIMIT_SECONDS
    });
  });

  it.each(['www.example.com', 'm.example.com', 'example.com'])(
    'ホスト名 %s の使用量はサイトキー example.com の行で引く',
    async (host) => {
      givenSettings({ blockList: [limitedItem()] });
      givenSeconds({ 'example.com': LIMIT_SECONDS });
      const result = await getBlockState(`https://${host}/page`);
      expect(result.reason).toBe('time_limit_exceeded');
    }
  );

  it('ワイルドカード・www. 付きで登録した項目も同じサイトキーで判定する', async () => {
    givenSettings({
      blockList: [
        limitedItem({ domain: '*.example.com', isWildcard: true }),
        limitedItem({ id: '2', domain: 'www.reddit.com' })
      ]
    });
    givenSeconds({ 'example.com': LIMIT_SECONDS, 'reddit.com': LIMIT_SECONDS });

    expect((await getBlockState('https://example.com')).blocked).toBe(true);
    expect((await getBlockState('https://m.reddit.com')).blocked).toBe(true);
  });

  it('同じサイトキーの項目が複数あれば、どれかがブロックならブロックする', async () => {
    givenSettings({
      blockList: [
        item({ domain: 'reddit.com', enabled: false }),
        item({ id: '2', domain: 'www.reddit.com', enabled: true })
      ]
    });
    const result = await getBlockState('https://www.reddit.com');
    expect(result).toEqual({ blocked: true, reason: 'always_blocked' });
    expect(await getActiveBlockedDomains()).toEqual(['reddit.com']);
  });

  it('親の登録がブロックしていれば、子の登録が無効でもサブドメインをブロックする', async () => {
    givenSettings({
      blockList: [
        item({ domain: 'google.com' }),
        item({ id: '2', domain: 'mail.google.com', enabled: false })
      ]
    });
    expect(await getBlockState('https://mail.google.com')).toEqual({
      blocked: true,
      reason: 'always_blocked'
    });
  });

  it('子の登録だけがブロックなら、親のホスト名はブロックしない', async () => {
    givenSettings({
      blockList: [
        item({ domain: 'google.com', enabled: false }),
        item({ id: '2', domain: 'mail.google.com' })
      ]
    });
    expect((await getBlockState('https://google.com')).blocked).toBe(false);
    expect((await getBlockState('https://mail.google.com')).blocked).toBe(true);
  });

  it('覆う登録がどれもブロックでなければ、残り秒数がいちばん少ない制限の値を返す', async () => {
    givenSettings({
      blockList: [
        limitedItem({ domain: 'google.com' }),
        limitedItem({
          id: '2',
          domain: 'mail.google.com',
          timeLimit: { type: 'daily', limitSeconds: 600 }
        })
      ]
    });
    givenSeconds({ 'google.com': 100, 'mail.google.com': 500 });
    expect(await getBlockState('https://mail.google.com')).toEqual({
      blocked: false,
      reason: null,
      remainingSeconds: 100
    });
  });
});

describe('getSiteBlockStatus', () => {
  it('サイトキー・ブロック設定・判定結果を返す', async () => {
    givenSettings({ blockList: [limitedItem({ domain: 'www.example.com' })] });
    givenSeconds({ 'example.com': 100 });

    expect(await getSiteBlockStatus('m.example.com')).toEqual({
      site: 'example.com',
      rule: {
        enabled: true,
        timeLimit: { type: 'daily', limitSeconds: LIMIT_SECONDS }
      },
      state: {
        blocked: false,
        reason: null,
        remainingSeconds: LIMIT_SECONDS - 100
      }
    });
  });

  it('ブロック設定の無いホスト名は null', async () => {
    givenSettings({ blockList: [item()] });
    expect(await getSiteBlockStatus('google.com')).toBeNull();
  });

  it('複数のホスト名は同じサイトを 1 件にまとめる', async () => {
    givenSettings({ blockList: [item()] });
    const statuses = await getSiteBlockStatuses([
      'www.example.com',
      'example.com',
      'google.com'
    ]);
    expect(statuses.map((s) => s.site)).toEqual(['example.com']);
    expect(mockGetSettings).toHaveBeenCalledOnce();
  });
});

describe('shouldBlockUrl', () => {
  it('getBlockStateの結果のblocked値を返す', async () => {
    givenSettings({ blockList: [item()] });
    expect(await shouldBlockUrl('https://example.com')).toBe(true);
    expect(await shouldBlockUrl('https://google.com')).toBe(false);
  });
});

describe('shouldTrackBlockForDomain', () => {
  // ブロックされたかどうかと記録するかどうかは同じ結論にする。
  // 揃っていないと、ブロックはされるのに記録されない・記録だけ増えるドメインが出る
  it.each([
    ['一時停止中', { paused: true, blockList: [item()] }, false],
    ['ブロックリストにない', { blockList: [] }, false],
    ['無効なアイテム', { blockList: [item({ enabled: false })] }, false],
    ['有効な常時ブロック', { blockList: [item()] }, true],
    ['時間制限の上限未満', { blockList: [limitedItem()] }, false]
  ] satisfies [string, Partial<AppSettings>, boolean][])(
    '%s',
    async (_label, settings, expected) => {
      givenSettings(settings);
      expect(await shouldTrackBlockForDomain('example.com')).toBe(expected);
    }
  );

  it('ブロックリストに無くても YouTube のアクセスブロックが有効ならtrue', async () => {
    givenSettings({ youtube: youtubeSettings() });
    expect(await shouldTrackBlockForDomain('www.youtube.com')).toBe(true);
  });
});

describe('YouTube（旧保存形から組み立てたブロック設定）', () => {
  it('アクセスブロックが有効ならブロックする', async () => {
    givenSettings({ youtube: youtubeSettings() });
    const result = await getBlockState('https://www.youtube.com/watch?v=abc');
    expect(result).toEqual({ blocked: true, reason: 'always_blocked' });
  });

  it('アクセスブロックが無効ならブロックしない', async () => {
    givenSettings({ youtube: youtubeSettings({ blockAccess: false }) });
    const result = await getBlockState('https://www.youtube.com/');
    expect(result).toEqual({ blocked: false, reason: null });
  });

  it('YouTube 自体が無効ならブロックしない', async () => {
    givenSettings({ youtube: youtubeSettings({ enabled: false }) });
    const result = await getBlockState('https://www.youtube.com/');
    expect(result).toEqual({ blocked: false, reason: null });
  });

  it('時間制限は youtube.com の今日の行で判定する', async () => {
    givenSettings({
      youtube: youtubeSettings({
        timeLimit: { type: 'daily', limitSeconds: 60 }
      })
    });
    givenSeconds({ [YOUTUBE_DOMAIN]: 30 });
    expect(await getBlockState('https://m.youtube.com/')).toEqual({
      blocked: false,
      reason: null,
      remainingSeconds: 30
    });

    givenSeconds({ [YOUTUBE_DOMAIN]: 60 });
    expect(await getBlockState('https://m.youtube.com/')).toEqual({
      blocked: true,
      reason: 'time_limit_exceeded',
      remainingSeconds: 0
    });
  });

  it('ブロックリストの youtube.com が無効でも、YouTube のアクセスブロックが有効ならブロックする', async () => {
    // 覆う登録のどれかがブロックならブロック（YouTube の設定も 1 件の登録として数える）
    givenSettings({
      blockList: [item({ domain: 'www.youtube.com', enabled: false })],
      youtube: youtubeSettings()
    });
    const result = await getBlockState('https://www.youtube.com/');
    expect(result).toEqual({ blocked: true, reason: 'always_blocked' });
    expect(await getActiveBlockedDomains()).toEqual([YOUTUBE_DOMAIN]);
  });
});

describe('getActiveBlockedDomains', () => {
  it('一時停止中は空配列を返す', async () => {
    givenSettings({
      paused: true,
      blockList: [item()],
      youtube: youtubeSettings()
    });
    expect(await getActiveBlockedDomains()).toEqual([]);
  });

  it('スケジュール外では常時ブロックの項目もブロックしない', async () => {
    mockIsWithinSchedule.mockReturnValue(false);
    givenSettings({
      blockList: [item()],
      schedules: OUT_OF_SCHEDULE,
      youtube: youtubeSettings()
    });
    expect(await getActiveBlockedDomains()).toEqual([]);
  });

  it('常時ブロックと上限に達した項目だけを含め、上限未満・無効な項目は含めない', async () => {
    givenSettings({
      blockList: [
        item({ id: '1', domain: 'always.com' }),
        limitedItem({ id: '2', domain: 'exceeded.com' }),
        limitedItem({ id: '3', domain: 'under.com' }),
        item({ id: '4', domain: 'disabled.com', enabled: false })
      ]
    });
    givenSeconds({ 'exceeded.com': LIMIT_SECONDS, 'under.com': 10 });

    expect(await getActiveBlockedDomains()).toEqual([
      'always.com',
      'exceeded.com'
    ]);
  });

  it('ワイルドカード・www. 付きの項目はサイトキーで返す', async () => {
    givenSettings({
      blockList: [
        item({ id: '1', domain: '*.example.com', isWildcard: true }),
        item({ id: '2', domain: 'www.reddit.com' })
      ]
    });
    expect(await getActiveBlockedDomains()).toEqual([
      'example.com',
      'reddit.com'
    ]);
  });

  it('YouTube のアクセスブロックが有効なら youtube.com を含める', async () => {
    givenSettings({ youtube: youtubeSettings() });
    expect(await getActiveBlockedDomains()).toEqual([YOUTUBE_DOMAIN]);
  });

  it('YouTube の時間制限は上限に達してから含める', async () => {
    givenSettings({
      youtube: youtubeSettings({
        timeLimit: { type: 'daily', limitSeconds: 60 }
      })
    });
    givenSeconds({ [YOUTUBE_DOMAIN]: 59 });
    expect(await getActiveBlockedDomains()).toEqual([]);

    givenSeconds({ [YOUTUBE_DOMAIN]: 60 });
    expect(await getActiveBlockedDomains()).toEqual([YOUTUBE_DOMAIN]);
  });
});

describe('判定とルール生成の一致', () => {
  // 開いているページの判定（getBlockStateForDomain）と新しい遷移を止めるルール
  // （getActiveBlockedDomains の各キーの `||キー`）は同じ入力で同じ結論にする。
  // どちらかが条件や範囲を独自に持つと、開いているタブと新しい遷移で結果がずれる
  const PARENT = 'example.com';
  const CHILD = 'mail.example.com';
  const HOSTS = [PARENT, `www.${PARENT}`, CHILD, `a.${CHILD}`, 'other.test'];

  /** ルールの集合がホスト名を `||キー` の範囲で覆うか */
  function ruleCovers(ruleDomains: readonly string[], host: string): boolean {
    return ruleDomains.some((key) => host === key || host.endsWith(`.${key}`));
  }

  const cases: [
    string,
    Partial<AppSettings>,
    Record<string, number>,
    boolean
  ][] = [
    ['常時ブロック', { blockList: [item()] }, {}, false],
    [
      'スケジュール外の常時ブロック',
      { blockList: [item()], schedules: OUT_OF_SCHEDULE },
      {},
      true
    ],
    [
      '上限に達した時間制限',
      { blockList: [limitedItem({ domain: 'www.example.com' })] },
      { [PARENT]: LIMIT_SECONDS },
      false
    ],
    [
      '上限未満の時間制限',
      { blockList: [limitedItem()] },
      { [PARENT]: 1 },
      false
    ],
    [
      'スケジュール外で上限に達した時間制限',
      { blockList: [limitedItem()], schedules: OUT_OF_SCHEDULE },
      { [PARENT]: LIMIT_SECONDS },
      true
    ],
    ['一時停止中', { paused: true, blockList: [item()] }, {}, false],
    [
      '親ブロック + 子無効',
      {
        blockList: [item(), item({ id: '2', domain: CHILD, enabled: false })]
      },
      {},
      false
    ],
    [
      '親無効 + 子ブロック',
      {
        blockList: [item({ enabled: false }), item({ id: '2', domain: CHILD })]
      },
      {},
      false
    ],
    [
      '親に時間制限（上限未満）+ 子常時',
      { blockList: [limitedItem(), item({ id: '2', domain: CHILD })] },
      { [PARENT]: 1 },
      false
    ],
    [
      '親に時間制限（上限到達）+ 子に時間制限（上限未満）',
      {
        blockList: [limitedItem(), limitedItem({ id: '2', domain: CHILD })]
      },
      { [PARENT]: LIMIT_SECONDS, [CHILD]: 1 },
      false
    ],
    [
      '同じサイトキーの重複登録（無効 + 有効）',
      {
        blockList: [
          item({ enabled: false }),
          item({ id: '2', domain: `www.${PARENT}` })
        ]
      },
      {},
      false
    ]
  ];

  it.each(cases)('%s', async (_label, settings, seconds, outOfSchedule) => {
    mockIsWithinSchedule.mockReturnValue(!outOfSchedule);
    givenSettings(settings);
    givenSeconds(seconds);

    const ruleDomains = await getActiveBlockedDomains();
    for (const host of HOSTS) {
      const state = await getBlockStateForDomain(host);
      expect({ host, blocked: state.blocked }).toEqual({
        host,
        blocked: ruleCovers(ruleDomains, host)
      });
    }
  });
});
