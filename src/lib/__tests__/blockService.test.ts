import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('~/lib/storage', () => ({
  getSettings: vi.fn(),
  getSites: vi.fn(),
  activityItem: { getValue: vi.fn() }
}));

vi.mock('~/lib/time', async (importOriginal) => ({
  ...(await importOriginal<typeof import('~/lib/time')>()),
  isWithinSchedule: vi.fn()
}));

import { getSettings, getSites, activityItem } from '~/lib/storage';
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
import { YOUTUBE_DOMAIN } from '~/lib/siteKey';
import {
  blockedSite,
  sitesOf,
  trackedSite,
  youtubeFeatures
} from '~/test/sites';
import type { AppSettings, Schedule } from '~/types/storage';
import type { ActivityLog } from '~/types/activity';
import type { BlockRule, TrackedSite } from '~/types/site';
import { DEFAULT_SETTINGS } from '~/types/storage';

const mockGetSettings = vi.mocked(getSettings);
const mockGetSites = vi.mocked(getSites);
const mockGetActivity = vi.mocked(activityItem.getValue);
const mockIsWithinSchedule = vi.mocked(isWithinSchedule);

const LIMIT_SECONDS = 1800;

beforeEach(() => {
  vi.clearAllMocks();
  mockIsWithinSchedule.mockReturnValue(true);
  mockGetActivity.mockResolvedValue({});
  mockGetSites.mockResolvedValue({});
  mockGetSettings.mockResolvedValue(DEFAULT_SETTINGS);
});

interface Given {
  settings?: Partial<AppSettings>;
  sites?: TrackedSite[];
}

function given({ settings = {}, sites = [] }: Given): void {
  mockGetSettings.mockResolvedValue({ ...DEFAULT_SETTINGS, ...settings });
  mockGetSites.mockResolvedValue(sitesOf(...sites));
}

function site(
  domain = 'example.com',
  block: Partial<BlockRule> = {}
): TrackedSite {
  return blockedSite(domain, block);
}

function limitedSite(
  domain = 'example.com',
  block: Partial<BlockRule> = {}
): TrackedSite {
  return blockedSite(domain, {
    timeLimit: { type: 'daily', limitSeconds: LIMIT_SECONDS },
    ...block
  });
}

function givenSeconds(
  seconds: Record<string, number>,
  date: Date = new Date()
): void {
  const row = Object.fromEntries(
    Object.entries(seconds).map(([key, s]) => [
      key,
      { seconds: s, blocks: 0, unblocks: 0 }
    ])
  );
  const log: ActivityLog = { [toDateKey(date)]: row };
  mockGetActivity.mockResolvedValue(log);
}

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
    // 設定が欠けているとブロックルールの再計算が丸ごと止まる
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
    given({
      settings: { schedules: [schedule({ enabled: false })] },
      sites: [site()]
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
    given({ settings: { paused: true }, sites: [site()] });
    const result = await getBlockState('https://example.com');
    expect(result).toEqual({ blocked: false, reason: null });
  });

  it('追跡中のサイトに無いURLはブロックしない', async () => {
    given({ sites: [site()] });
    const result = await getBlockState('https://google.com');
    expect(result).toEqual({ blocked: false, reason: null });
  });

  it('追跡だけのサイト（ブロック設定なし）はブロックしない', async () => {
    given({ sites: [trackedSite('example.com')] });
    const result = await getBlockState('https://example.com');
    expect(result).toEqual({ blocked: false, reason: null });
  });

  it('無効化されたブロック設定はブロックしない', async () => {
    given({ sites: [site('example.com', { enabled: false })] });
    const result = await getBlockState('https://example.com');
    expect(result).toEqual({ blocked: false, reason: null });
  });

  it('スケジュール外では常時ブロックのサイトもブロックしない', async () => {
    mockIsWithinSchedule.mockReturnValue(false);
    given({ settings: { schedules: OUT_OF_SCHEDULE }, sites: [site()] });
    const result = await getBlockState('https://example.com');
    expect(result).toEqual({ blocked: false, reason: null });
  });

  it('スケジュール外では上限を超えていてもブロックせず、残り時間も返さない', async () => {
    mockIsWithinSchedule.mockReturnValue(false);
    given({ settings: { schedules: OUT_OF_SCHEDULE }, sites: [limitedSite()] });
    givenSeconds({ 'example.com': LIMIT_SECONDS * 2 });
    const result = await getBlockState('https://example.com');
    expect(result).toEqual({ blocked: false, reason: null });
  });

  it('タイムリミットなしの場合は常にブロック', async () => {
    given({ sites: [site()] });
    const result = await getBlockState('https://example.com');
    expect(result).toEqual({ blocked: true, reason: 'always_blocked' });
  });

  it('今日の表示秒数が上限に達したらブロック', async () => {
    given({ sites: [limitedSite()] });
    givenSeconds({ 'example.com': LIMIT_SECONDS });
    const result = await getBlockState('https://example.com');
    expect(result).toEqual({
      blocked: true,
      reason: 'time_limit_exceeded',
      remainingSeconds: 0
    });
  });

  it('上限未満ならブロックせず残り時間を返す', async () => {
    given({ sites: [limitedSite()] });
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
    given({ sites: [limitedSite()] });
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
      given({ sites: [limitedSite()] });
      givenSeconds({ 'example.com': LIMIT_SECONDS });
      const result = await getBlockState(`https://${host}/page`);
      expect(result.reason).toBe('time_limit_exceeded');
    }
  );

  it('保存値が入れ子でも、親がブロックしていれば子が無効でもサブドメインをブロックする', async () => {
    given({
      sites: [site('google.com'), site('mail.google.com', { enabled: false })]
    });
    expect(await getBlockState('https://mail.google.com')).toEqual({
      blocked: true,
      reason: 'always_blocked'
    });
  });

  it('保存値が入れ子で子だけがブロックなら、親のホスト名はブロックしない', async () => {
    given({
      sites: [site('google.com', { enabled: false }), site('mail.google.com')]
    });
    expect((await getBlockState('https://google.com')).blocked).toBe(false);
    expect((await getBlockState('https://mail.google.com')).blocked).toBe(true);
  });

  it('覆う登録がどれもブロックでなければ、残り秒数がいちばん少ない制限の値を返す', async () => {
    given({
      sites: [
        limitedSite('google.com'),
        limitedSite('mail.google.com', {
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
    given({ sites: [limitedSite()] });
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
    given({ sites: [site(), trackedSite('google.com')] });
    expect(await getSiteBlockStatus('google.com')).toBeNull();
  });

  it('複数のホスト名は同じサイトを 1 件にまとめる', async () => {
    given({ sites: [site()] });
    const statuses = await getSiteBlockStatuses([
      'www.example.com',
      'example.com',
      'google.com'
    ]);
    expect(statuses.map((s) => s.site)).toEqual(['example.com']);
    expect(mockGetSettings).toHaveBeenCalledOnce();
    expect(mockGetSites).toHaveBeenCalledOnce();
  });
});

describe('shouldBlockUrl', () => {
  it('getBlockStateの結果のblocked値を返す', async () => {
    given({ sites: [site()] });
    expect(await shouldBlockUrl('https://example.com')).toBe(true);
    expect(await shouldBlockUrl('https://google.com')).toBe(false);
  });
});

describe('shouldTrackBlockForDomain', () => {
  it.each([
    ['一時停止中', { settings: { paused: true }, sites: [site()] }, false],
    ['追跡中のサイトにない', { sites: [] }, false],
    [
      '無効なブロック設定',
      { sites: [site('example.com', { enabled: false })] },
      false
    ],
    ['有効な常時ブロック', { sites: [site()] }, true],
    ['時間制限の上限未満', { sites: [limitedSite()] }, false]
  ] satisfies [string, Given, boolean][])(
    '%s',
    async (_label, input, expected) => {
      given(input);
      expect(await shouldTrackBlockForDomain('example.com')).toBe(expected);
    }
  );
});

describe('YouTube（youtube.com も普通の追跡中のサイト）', () => {
  it('youtube.com のブロック設定が有効ならサブドメインもブロックする', async () => {
    given({
      sites: [site(YOUTUBE_DOMAIN, {}), trackedSite('other.com')]
    });
    const result = await getBlockState('https://www.youtube.com/watch?v=abc');
    expect(result).toEqual({ blocked: true, reason: 'always_blocked' });
  });

  it('YouTube 機能だけ（ブロック設定なし）ならブロックしない', async () => {
    given({
      sites: [trackedSite(YOUTUBE_DOMAIN, { youtube: youtubeFeatures() })]
    });
    const result = await getBlockState('https://www.youtube.com/');
    expect(result).toEqual({ blocked: false, reason: null });
  });

  it('時間制限は youtube.com の今日の行で判定する', async () => {
    given({
      sites: [
        site(YOUTUBE_DOMAIN, { timeLimit: { type: 'daily', limitSeconds: 60 } })
      ]
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
});

describe('getActiveBlockedDomains', () => {
  it('一時停止中は空配列を返す', async () => {
    given({
      settings: { paused: true },
      sites: [site(), site(YOUTUBE_DOMAIN)]
    });
    expect(await getActiveBlockedDomains()).toEqual([]);
  });

  it('スケジュール外では常時ブロックのサイトもブロックしない', async () => {
    mockIsWithinSchedule.mockReturnValue(false);
    given({
      settings: { schedules: OUT_OF_SCHEDULE },
      sites: [site(), site(YOUTUBE_DOMAIN)]
    });
    expect(await getActiveBlockedDomains()).toEqual([]);
  });

  it('常時ブロックと上限に達したサイトだけを含め、上限未満・無効・追跡だけのサイトは含めない', async () => {
    given({
      sites: [
        site('always.com'),
        limitedSite('exceeded.com'),
        limitedSite('under.com'),
        site('disabled.com', { enabled: false }),
        trackedSite('tracked.com')
      ]
    });
    givenSeconds({ 'exceeded.com': LIMIT_SECONDS, 'under.com': 10 });

    expect(await getActiveBlockedDomains()).toEqual([
      'always.com',
      'exceeded.com'
    ]);
  });

  it('youtube.com のブロック設定も他のサイトと同じく含める', async () => {
    given({ sites: [site(YOUTUBE_DOMAIN)] });
    expect(await getActiveBlockedDomains()).toEqual([YOUTUBE_DOMAIN]);
  });
});

describe('判定とルール生成の一致', () => {
  const PARENT = 'example.com';
  const CHILD = 'mail.example.com';
  const HOSTS = [PARENT, `www.${PARENT}`, CHILD, `a.${CHILD}`, 'other.test'];

  function ruleCovers(ruleDomains: readonly string[], host: string): boolean {
    return ruleDomains.some((key) => host === key || host.endsWith(`.${key}`));
  }

  const cases: [string, Given, Record<string, number>, boolean][] = [
    ['常時ブロック', { sites: [site()] }, {}, false],
    [
      'スケジュール外の常時ブロック',
      { settings: { schedules: OUT_OF_SCHEDULE }, sites: [site()] },
      {},
      true
    ],
    [
      '上限に達した時間制限',
      { sites: [limitedSite()] },
      { [PARENT]: LIMIT_SECONDS },
      false
    ],
    ['上限未満の時間制限', { sites: [limitedSite()] }, { [PARENT]: 1 }, false],
    [
      'スケジュール外で上限に達した時間制限',
      { settings: { schedules: OUT_OF_SCHEDULE }, sites: [limitedSite()] },
      { [PARENT]: LIMIT_SECONDS },
      true
    ],
    ['一時停止中', { settings: { paused: true }, sites: [site()] }, {}, false],
    [
      '入れ子の保存値: 親ブロック + 子無効',
      { sites: [site(), site(CHILD, { enabled: false })] },
      {},
      false
    ],
    [
      '入れ子の保存値: 親無効 + 子ブロック',
      { sites: [site(PARENT, { enabled: false }), site(CHILD)] },
      {},
      false
    ],
    [
      '入れ子の保存値: 親に時間制限（上限未満）+ 子常時',
      { sites: [limitedSite(), site(CHILD)] },
      { [PARENT]: 1 },
      false
    ],
    [
      '入れ子の保存値: 親に時間制限（上限到達）+ 子に時間制限（上限未満）',
      { sites: [limitedSite(), limitedSite(CHILD)] },
      { [PARENT]: LIMIT_SECONDS, [CHILD]: 1 },
      false
    ]
  ];

  it.each(cases)('%s', async (_label, input, seconds, outOfSchedule) => {
    mockIsWithinSchedule.mockReturnValue(!outOfSchedule);
    given(input);
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
