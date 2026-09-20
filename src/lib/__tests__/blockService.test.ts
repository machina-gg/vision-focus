import { describe, expect, it, vi, beforeEach } from 'vitest';

import { isAnyScheduleActive } from '~/lib/blockService';
import type { Schedule } from '~/types/storage';

// storage モジュールをモック
vi.mock('~/lib/storage', () => ({
  getSettings: vi.fn(),
  getAnalytics: vi.fn()
}));

// time モジュールの isWithinSchedule をモック
vi.mock('~/lib/time', () => ({
  isWithinSchedule: vi.fn(),
  getTodayKey: vi.fn(() => '2024-06-12'),
  needsDailyReset: vi.fn(() => false)
}));

// timeLimitService をモック
// （calculateRemainingTime は youtubeBlockService が import するため、
//   モックから欠けていると同モジュールの読み込みで落ちる）
vi.mock('~/lib/timeLimitService', () => ({
  hasExceededTimeLimit: vi.fn(),
  getRemainingTime: vi.fn(),
  checkTimeLimitExceeded: vi.fn(),
  calculateRemainingTime: vi.fn()
}));

import { getSettings, getAnalytics } from '~/lib/storage';
import { isWithinSchedule } from '~/lib/time';
import {
  hasExceededTimeLimit,
  getRemainingTime,
  checkTimeLimitExceeded
} from '~/lib/timeLimitService';
import {
  findBlockItemForDomain,
  findEnabledBlockItemForDomain,
  getBlockState,
  getYouTubeBlockItem,
  shouldBlockUrl,
  shouldTrackBlockForDomain,
  getActiveBlockedDomains
} from '~/lib/blockService';
import { YOUTUBE_DOMAIN } from '~/lib/youtubeBlockService';
import type { AppSettings, YouTubeSettings } from '~/types/storage';
import {
  DEFAULT_SETTINGS,
  DEFAULT_ANALYTICS,
  DEFAULT_YOUTUBE_SETTINGS
} from '~/types/storage';

const mockGetSettings = vi.mocked(getSettings);
const mockGetAnalytics = vi.mocked(getAnalytics);
const mockIsWithinSchedule = vi.mocked(isWithinSchedule);
const mockHasExceededTimeLimit = vi.mocked(hasExceededTimeLimit);
const mockGetRemainingTime = vi.mocked(getRemainingTime);
const mockCheckTimeLimitExceeded = vi.mocked(checkTimeLimitExceeded);

beforeEach(() => {
  vi.clearAllMocks();
  mockIsWithinSchedule.mockReturnValue(true);
});

// テスト用の設定を生成
function createSettings(overrides: Partial<AppSettings> = {}): AppSettings {
  return { ...DEFAULT_SETTINGS, ...overrides };
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

// スケジュール外を再現するための、常に「有効だが時間外」のスケジュール
const OUT_OF_SCHEDULE = [
  {
    id: 's1',
    name: 'Work',
    startTime: '09:00',
    endTime: '17:00',
    days: [1],
    enabled: true
  }
];

describe('isAnyScheduleActive', () => {
  it('schedules が未設定でも例外を投げず true を返す', () => {
    // 設定が欠けているとブロックルールの再計算が丸ごと止まるため、
    // ここで落ちないことを保証する
    expect(isAnyScheduleActive(undefined)).toBe(true);
  });

  it('スケジュールが空の場合はtrueを返す', () => {
    expect(isAnyScheduleActive([])).toBe(true);
  });

  it('有効なスケジュールがスケジュール内の場合はtrue', () => {
    mockIsWithinSchedule.mockReturnValue(true);
    const schedules: Schedule[] = [
      {
        id: 's1',
        name: 'Test',
        startTime: '09:00',
        endTime: '17:00',
        days: [1, 2, 3, 4, 5],
        enabled: true
      }
    ];
    expect(isAnyScheduleActive(schedules)).toBe(true);
  });

  it('スケジュールが無効の場合はfalse', () => {
    mockIsWithinSchedule.mockReturnValue(true);
    const schedules: Schedule[] = [
      {
        id: 's1',
        name: 'Test',
        startTime: '09:00',
        endTime: '17:00',
        days: [1, 2, 3, 4, 5],
        enabled: false
      }
    ];
    expect(isAnyScheduleActive(schedules)).toBe(false);
  });

  it('スケジュール外の場合はfalse', () => {
    mockIsWithinSchedule.mockReturnValue(false);
    const schedules: Schedule[] = [
      {
        id: 's1',
        name: 'Test',
        startTime: '09:00',
        endTime: '17:00',
        days: [1, 2, 3, 4, 5],
        enabled: true
      }
    ];
    expect(isAnyScheduleActive(schedules)).toBe(false);
  });
});

describe('findBlockItemForDomain', () => {
  it('一致するドメインのBlockItemを返す', async () => {
    const settings = createSettings({
      blockList: [
        {
          id: 'b1',
          domain: 'youtube.com',
          isWildcard: false,
          createdAt: '2024-01-01T00:00:00Z',
          enabled: true
        }
      ]
    });
    mockGetSettings.mockResolvedValue(settings);
    const result = await findBlockItemForDomain('youtube.com');
    expect(result).not.toBeNull();
    expect(result!.domain).toBe('youtube.com');
  });

  it('一致しない場合はnullを返す', async () => {
    const settings = createSettings({ blockList: [] });
    mockGetSettings.mockResolvedValue(settings);
    const result = await findBlockItemForDomain('youtube.com');
    expect(result).toBeNull();
  });

  it('設定を引数で渡せる', async () => {
    const settings = createSettings({
      blockList: [
        {
          id: 'b1',
          domain: 'twitter.com',
          isWildcard: false,
          createdAt: '2024-01-01T00:00:00Z',
          enabled: true
        }
      ]
    });
    const result = await findBlockItemForDomain('twitter.com', settings);
    expect(result).not.toBeNull();
    // getSettingsは呼ばれない
    expect(mockGetSettings).not.toHaveBeenCalled();
  });
});

describe('findEnabledBlockItemForDomain', () => {
  it('有効なBlockItemを返す', async () => {
    const settings = createSettings({
      blockList: [
        {
          id: 'b1',
          domain: 'youtube.com',
          isWildcard: false,
          createdAt: '2024-01-01T00:00:00Z',
          enabled: true
        }
      ]
    });
    mockGetSettings.mockResolvedValue(settings);
    const result = await findEnabledBlockItemForDomain('youtube.com');
    expect(result).not.toBeNull();
  });

  it('無効なBlockItemはnullを返す', async () => {
    const settings = createSettings({
      blockList: [
        {
          id: 'b1',
          domain: 'youtube.com',
          isWildcard: false,
          createdAt: '2024-01-01T00:00:00Z',
          enabled: false
        }
      ]
    });
    mockGetSettings.mockResolvedValue(settings);
    const result = await findEnabledBlockItemForDomain('youtube.com');
    expect(result).toBeNull();
  });
});

describe('getBlockState', () => {
  it('無効なURLではブロックしない', async () => {
    const result = await getBlockState('');
    expect(result.blocked).toBe(false);
    expect(result.reason).toBeNull();
  });

  it('一時停止中はブロックしない', async () => {
    mockGetSettings.mockResolvedValue(
      createSettings({
        paused: true,
        blockList: [
          {
            id: 'b1',
            domain: 'youtube.com',
            isWildcard: false,
            createdAt: '2024-01-01T00:00:00Z',
            enabled: true
          }
        ]
      })
    );
    const result = await getBlockState('https://youtube.com');
    expect(result.blocked).toBe(false);
  });

  it('ブロックリストにないURLはブロックしない', async () => {
    mockGetSettings.mockResolvedValue(createSettings({ blockList: [] }));
    const result = await getBlockState('https://youtube.com');
    expect(result.blocked).toBe(false);
  });

  it('無効化されたアイテムはブロックしない', async () => {
    mockGetSettings.mockResolvedValue(
      createSettings({
        blockList: [
          {
            id: 'b1',
            domain: 'youtube.com',
            isWildcard: false,
            createdAt: '2024-01-01T00:00:00Z',
            enabled: false
          }
        ]
      })
    );
    const result = await getBlockState('https://youtube.com');
    expect(result.blocked).toBe(false);
  });

  it('スケジュール外ではブロックしない', async () => {
    mockIsWithinSchedule.mockReturnValue(false);
    mockGetSettings.mockResolvedValue(
      createSettings({
        blockList: [
          {
            id: 'b1',
            domain: 'youtube.com',
            isWildcard: false,
            createdAt: '2024-01-01T00:00:00Z',
            enabled: true
          }
        ],
        schedules: [
          {
            id: 's1',
            name: 'Work',
            startTime: '09:00',
            endTime: '17:00',
            days: [1],
            enabled: true
          }
        ]
      })
    );
    const result = await getBlockState('https://youtube.com');
    expect(result.blocked).toBe(false);
  });

  it('タイムリミットなしの場合は常にブロック', async () => {
    mockGetSettings.mockResolvedValue(
      createSettings({
        blockList: [
          {
            id: 'b1',
            domain: 'youtube.com',
            isWildcard: false,
            createdAt: '2024-01-01T00:00:00Z',
            enabled: true
          }
        ]
      })
    );
    const result = await getBlockState('https://youtube.com');
    expect(result.blocked).toBe(true);
    expect(result.reason).toBe('always_blocked');
  });

  it('タイムリミット超過の場合にブロック', async () => {
    mockGetSettings.mockResolvedValue(
      createSettings({
        blockList: [
          {
            id: 'b1',
            domain: 'youtube.com',
            isWildcard: false,
            createdAt: '2024-01-01T00:00:00Z',
            enabled: true,
            timeLimit: { type: 'daily', limitSeconds: 3600 }
          }
        ]
      })
    );
    mockHasExceededTimeLimit.mockResolvedValue(true);
    const result = await getBlockState('https://youtube.com');
    expect(result.blocked).toBe(true);
    expect(result.reason).toBe('time_limit_exceeded');
  });

  it('タイムリミット未超過の場合はブロックしない', async () => {
    mockGetSettings.mockResolvedValue(
      createSettings({
        blockList: [
          {
            id: 'b1',
            domain: 'youtube.com',
            isWildcard: false,
            createdAt: '2024-01-01T00:00:00Z',
            enabled: true,
            timeLimit: { type: 'daily', limitSeconds: 3600 }
          }
        ]
      })
    );
    mockHasExceededTimeLimit.mockResolvedValue(false);
    mockGetRemainingTime.mockResolvedValue(1800);
    const result = await getBlockState('https://youtube.com');
    expect(result.blocked).toBe(false);
    expect(result.remainingSeconds).toBe(1800);
  });
});

describe('shouldBlockUrl', () => {
  it('getBlockStateの結果のblocked値を返す', async () => {
    mockGetSettings.mockResolvedValue(
      createSettings({
        blockList: [
          {
            id: 'b1',
            domain: 'youtube.com',
            isWildcard: false,
            createdAt: '2024-01-01T00:00:00Z',
            enabled: true
          }
        ]
      })
    );
    const result = await shouldBlockUrl('https://youtube.com');
    expect(result).toBe(true);
  });
});

describe('shouldTrackBlockForDomain', () => {
  it('一時停止中はfalse', async () => {
    mockGetSettings.mockResolvedValue(createSettings({ paused: true }));
    const result = await shouldTrackBlockForDomain('youtube.com');
    expect(result).toBe(false);
  });

  it('ブロックリストにないドメインはfalse', async () => {
    mockGetSettings.mockResolvedValue(createSettings({ blockList: [] }));
    const result = await shouldTrackBlockForDomain('youtube.com');
    expect(result).toBe(false);
  });

  it('無効なアイテムのドメインはfalse', async () => {
    mockGetSettings.mockResolvedValue(
      createSettings({
        blockList: [
          {
            id: 'b1',
            domain: 'youtube.com',
            isWildcard: false,
            createdAt: '2024-01-01T00:00:00Z',
            enabled: false
          }
        ]
      })
    );
    const result = await shouldTrackBlockForDomain('youtube.com');
    expect(result).toBe(false);
  });

  it('有効なアイテムでスケジュール内ならtrue', async () => {
    mockGetSettings.mockResolvedValue(
      createSettings({
        blockList: [
          {
            id: 'b1',
            domain: 'youtube.com',
            isWildcard: false,
            createdAt: '2024-01-01T00:00:00Z',
            enabled: true
          }
        ]
      })
    );
    const result = await shouldTrackBlockForDomain('youtube.com');
    expect(result).toBe(true);
  });
});

describe('getActiveBlockedDomains', () => {
  it('一時停止中は空配列を返す', async () => {
    mockGetSettings.mockResolvedValue(createSettings({ paused: true }));
    const result = await getActiveBlockedDomains();
    expect(result).toEqual([]);
  });

  it('スケジュール外でも常時ブロックサイト（timeLimit なし）はブロックする', async () => {
    mockIsWithinSchedule.mockReturnValue(false);
    mockGetSettings.mockResolvedValue(
      createSettings({
        blockList: [
          {
            id: 'b1',
            domain: 'twitter.com',
            isWildcard: false,
            createdAt: '2024-01-01T00:00:00Z',
            enabled: true
          }
        ],
        schedules: [
          {
            id: 's1',
            name: 'Test',
            startTime: '09:00',
            endTime: '17:00',
            days: [1],
            enabled: true
          }
        ]
      })
    );
    mockGetAnalytics.mockResolvedValue(DEFAULT_ANALYTICS);
    const result = await getActiveBlockedDomains();
    expect(result).toContain('twitter.com');
  });

  it('タイムリミットなしの有効アイテムをリストに含む', async () => {
    mockGetSettings.mockResolvedValue(
      createSettings({
        blockList: [
          {
            id: 'b1',
            domain: 'youtube.com',
            isWildcard: false,
            createdAt: '2024-01-01T00:00:00Z',
            enabled: true
          }
        ]
      })
    );
    mockGetAnalytics.mockResolvedValue(DEFAULT_ANALYTICS);
    const result = await getActiveBlockedDomains();
    expect(result).toContain('youtube.com');
  });

  it('タイムリミット超過のアイテムもリストに含む', async () => {
    mockGetSettings.mockResolvedValue(
      createSettings({
        blockList: [
          {
            id: 'b1',
            domain: 'twitter.com',
            isWildcard: false,
            createdAt: '2024-01-01T00:00:00Z',
            enabled: true,
            timeLimit: { type: 'daily', limitSeconds: 3600 }
          }
        ]
      })
    );
    mockGetAnalytics.mockResolvedValue(DEFAULT_ANALYTICS);
    mockCheckTimeLimitExceeded.mockReturnValue(true);
    const result = await getActiveBlockedDomains();
    expect(result).toContain('twitter.com');
  });

  it('YouTube blockAccessが有効でスケジュール内ならYouTubeドメインを含む', async () => {
    mockGetSettings.mockResolvedValue(
      createSettings({
        youtube: {
          enabled: true,
          blockAccess: true,
          hideShorts: false,
          hideRecommendations: false,
          hideComments: false,
          hideHomeFeed: false,
          timeLimit: null
        }
      })
    );
    mockGetAnalytics.mockResolvedValue(DEFAULT_ANALYTICS);
    const result = await getActiveBlockedDomains();
    expect(result).toContain('youtube.com');
    expect(result).toContain('www.youtube.com');
  });

  it('無効なアイテムはリストに含まない', async () => {
    mockGetSettings.mockResolvedValue(
      createSettings({
        blockList: [
          {
            id: 'b1',
            domain: 'youtube.com',
            isWildcard: false,
            createdAt: '2024-01-01T00:00:00Z',
            enabled: false
          }
        ]
      })
    );
    mockGetAnalytics.mockResolvedValue(DEFAULT_ANALYTICS);
    const result = await getActiveBlockedDomains();
    expect(result).not.toContain('youtube.com');
  });

  it('YouTube blockAccessはスケジュール外では動作しない', async () => {
    mockIsWithinSchedule.mockReturnValue(false);
    mockGetSettings.mockResolvedValue(
      createSettings({
        youtube: {
          enabled: true,
          blockAccess: true,
          hideShorts: false,
          hideRecommendations: false,
          hideComments: false,
          hideHomeFeed: false,
          timeLimit: null
        },
        schedules: [
          {
            id: 's1',
            name: 'Test',
            startTime: '09:00',
            endTime: '17:00',
            days: [1],
            enabled: true
          }
        ]
      })
    );
    mockGetAnalytics.mockResolvedValue(DEFAULT_ANALYTICS);
    const result = await getActiveBlockedDomains();
    expect(result).toEqual([]);
  });

  it('一時停止中はYouTubeブロックも無効になる', async () => {
    mockGetSettings.mockResolvedValue(
      createSettings({
        paused: true,
        youtube: {
          enabled: true,
          blockAccess: true,
          hideShorts: false,
          hideRecommendations: false,
          hideComments: false,
          hideHomeFeed: false,
          timeLimit: null
        }
      })
    );
    const result = await getActiveBlockedDomains();
    expect(result).toEqual([]);
  });
});

describe('getYouTubeBlockItem', () => {
  it('アクセスブロックが有効なら仮想のブロック項目を返す', () => {
    const item = getYouTubeBlockItem(
      createSettings({ youtube: youtubeSettings() })
    );

    expect(item).not.toBeNull();
    expect(item!.enabled).toBe(true);
    expect(item!.timeLimit).toBeNull();
  });

  it('計測キーは youtubeBlockService と同じドメインにする', () => {
    // ずれると時間制限の超過判定が別のキーを読み、永久に超過しなくなる
    const item = getYouTubeBlockItem(
      createSettings({ youtube: youtubeSettings() })
    );

    expect(item!.domain).toBe(YOUTUBE_DOMAIN);
  });

  it('時間制限の設定をそのまま引き継ぐ', () => {
    const timeLimit = { type: 'daily' as const, limitSeconds: 60 };
    const item = getYouTubeBlockItem(
      createSettings({ youtube: youtubeSettings({ timeLimit }) })
    );

    expect(item!.timeLimit).toEqual(timeLimit);
  });

  it.each([
    ['YouTube 自体が無効', { enabled: false, blockAccess: true }],
    ['アクセスブロックが無効', { enabled: true, blockAccess: false }],
    ['どちらも無効', { enabled: false, blockAccess: false }]
  ])('%s のときは null を返す', (_label, overrides) => {
    const item = getYouTubeBlockItem(
      createSettings({ youtube: youtubeSettings(overrides) })
    );

    expect(item).toBeNull();
  });
});

describe('getBlockState - YouTube（仮想のブロック項目）', () => {
  it.each([
    ['https://youtube.com/'],
    ['https://www.youtube.com/watch?v=abc'],
    ['https://m.youtube.com/']
  ])('%s は時間制限なしなら常時ブロックする', async (url) => {
    mockGetSettings.mockResolvedValue(
      createSettings({ youtube: youtubeSettings() })
    );

    const result = await getBlockState(url);

    expect(result.blocked).toBe(true);
    expect(result.reason).toBe('always_blocked');
  });

  it('アクセスブロックが無効ならブロックしない', async () => {
    mockGetSettings.mockResolvedValue(
      createSettings({ youtube: youtubeSettings({ blockAccess: false }) })
    );

    const result = await getBlockState('https://www.youtube.com/');

    expect(result.blocked).toBe(false);
    expect(result.reason).toBeNull();
  });

  it('YouTube 自体が無効ならブロックしない', async () => {
    mockGetSettings.mockResolvedValue(
      createSettings({ youtube: youtubeSettings({ enabled: false }) })
    );

    const result = await getBlockState('https://www.youtube.com/');

    expect(result.blocked).toBe(false);
  });

  it('一時停止中はブロックしない', async () => {
    mockGetSettings.mockResolvedValue(
      createSettings({ paused: true, youtube: youtubeSettings() })
    );

    const result = await getBlockState('https://www.youtube.com/');

    expect(result.blocked).toBe(false);
  });

  it('スケジュール外ではブロックしない', async () => {
    mockIsWithinSchedule.mockReturnValue(false);
    mockGetSettings.mockResolvedValue(
      createSettings({
        youtube: youtubeSettings(),
        schedules: OUT_OF_SCHEDULE
      })
    );

    const result = await getBlockState('https://www.youtube.com/');

    expect(result.blocked).toBe(false);
  });

  it('時間制限を超過したらブロックする', async () => {
    const timeLimit = { type: 'daily' as const, limitSeconds: 60 };
    mockGetSettings.mockResolvedValue(
      createSettings({ youtube: youtubeSettings({ timeLimit }) })
    );
    mockHasExceededTimeLimit.mockResolvedValue(true);

    const result = await getBlockState('https://www.youtube.com/watch?v=abc');

    expect(result.blocked).toBe(true);
    expect(result.reason).toBe('time_limit_exceeded');
  });

  it('時間制限が未超過ならブロックせず残り時間を返す', async () => {
    const timeLimit = { type: 'daily' as const, limitSeconds: 60 };
    mockGetSettings.mockResolvedValue(
      createSettings({ youtube: youtubeSettings({ timeLimit }) })
    );
    mockHasExceededTimeLimit.mockResolvedValue(false);
    mockGetRemainingTime.mockResolvedValue(30);

    const result = await getBlockState('https://www.youtube.com/watch?v=abc');

    expect(result.blocked).toBe(false);
    expect(result.remainingSeconds).toBe(30);
  });

  it('使用実績はホスト名ではなく youtube.com で引く', async () => {
    // 計測は youtubeBlockService が 'youtube.com' 固定で記録するため、
    // 'www.youtube.com' で引くと永久に超過しない
    const timeLimit = { type: 'daily' as const, limitSeconds: 60 };
    mockGetSettings.mockResolvedValue(
      createSettings({ youtube: youtubeSettings({ timeLimit }) })
    );
    mockHasExceededTimeLimit.mockResolvedValue(true);

    await getBlockState('https://www.youtube.com/watch?v=abc');

    expect(mockHasExceededTimeLimit).toHaveBeenCalledWith(
      YOUTUBE_DOMAIN,
      expect.objectContaining({ timeLimit })
    );
  });

  it('ブロックリストに同じドメインがあればそちらの設定が優先される', async () => {
    mockGetSettings.mockResolvedValue(
      createSettings({
        youtube: youtubeSettings(),
        blockList: [
          {
            id: 'b1',
            domain: 'youtube.com',
            isWildcard: false,
            createdAt: '2024-01-01T00:00:00Z',
            enabled: false
          }
        ]
      })
    );

    const result = await getBlockState('https://www.youtube.com/');

    expect(result.blocked).toBe(false);
  });
});

describe('getActiveBlockedDomains - YouTube の時間制限', () => {
  const timeLimit = { type: 'daily' as const, limitSeconds: 60 };

  beforeEach(() => {
    mockGetAnalytics.mockResolvedValue(DEFAULT_ANALYTICS);
  });

  it('時間制限が未超過ならブロック対象に含めない', async () => {
    mockGetSettings.mockResolvedValue(
      createSettings({ youtube: youtubeSettings({ timeLimit }) })
    );
    mockCheckTimeLimitExceeded.mockReturnValue(false);

    const result = await getActiveBlockedDomains();

    expect(result).toEqual([]);
  });

  it('時間制限を超過したらブロック対象に含める', async () => {
    mockGetSettings.mockResolvedValue(
      createSettings({ youtube: youtubeSettings({ timeLimit }) })
    );
    mockCheckTimeLimitExceeded.mockReturnValue(true);

    const result = await getActiveBlockedDomains();

    expect(result).toContain('youtube.com');
    expect(result).toContain('www.youtube.com');
    expect(mockCheckTimeLimitExceeded).toHaveBeenCalledWith(
      YOUTUBE_DOMAIN,
      timeLimit,
      DEFAULT_ANALYTICS
    );
  });

  it('アクセスブロックが無効ならブロック対象に含めない', async () => {
    mockGetSettings.mockResolvedValue(
      createSettings({ youtube: youtubeSettings({ blockAccess: false }) })
    );

    const result = await getActiveBlockedDomains();

    expect(result).toEqual([]);
  });
});
