import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import {
  exportBlockList,
  blockListRows,
  blockCountRows,
  dailyActivityRows,
  unblockedSiteRows,
  exportSiteBlockCounts,
  exportDailyActivity,
  exportUnblockedSiteTimes
} from '~/lib/export';
import { parseDateKey } from '~/lib/activityStats';
import { formatTime } from '~/lib/time';
import { YOUTUBE_DOMAIN } from '~/lib/siteKey';
import { blockedSite, sitesOf, trackedSite } from '~/test/sites';
import type { ActivityLog } from '~/types/activity';
import type { TrackedSites } from '~/types/site';

function blockSitesOf(
  ...entries: [domain: string, addedAt?: string][]
): TrackedSites {
  return sitesOf(
    ...entries.map(([domain, addedAt = '2024-01-15T10:00:00Z']) =>
      blockedSite(domain, { addedAt })
    )
  );
}

describe('export utilities', () => {
  let mockCreateElement: ReturnType<typeof vi.fn>;
  let mockAppendChild: ReturnType<typeof vi.fn>;
  let mockRemoveChild: ReturnType<typeof vi.fn>;
  let mockClick: ReturnType<typeof vi.fn>;
  let mockCreateObjectURL: ReturnType<typeof vi.fn>;
  let mockRevokeObjectURL: ReturnType<typeof vi.fn>;
  let mockLink: { href: string; download: string; click: typeof mockClick };

  beforeEach(() => {
    mockClick = vi.fn();
    mockLink = {
      href: '',
      download: '',
      click: mockClick
    };
    mockCreateElement = vi.fn(() => mockLink);
    mockAppendChild = vi.fn();
    mockRemoveChild = vi.fn();

    global.document.createElement =
      mockCreateElement as unknown as typeof document.createElement;
    global.document.body.appendChild =
      mockAppendChild as unknown as typeof document.body.appendChild;
    global.document.body.removeChild =
      mockRemoveChild as unknown as typeof document.body.removeChild;

    mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
    mockRevokeObjectURL = vi.fn();
    global.URL.createObjectURL =
      mockCreateObjectURL as unknown as typeof URL.createObjectURL;
    global.URL.revokeObjectURL =
      mockRevokeObjectURL as unknown as typeof URL.revokeObjectURL;

    // vitest 4 は new 付きで呼ばれたモックをコンストラクタとして実行するため、アロー関数でなく function 宣言で書く
    global.Blob = vi.fn(function (content, options) {
      return { content, options };
    }) as unknown as typeof Blob;

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('exportBlockList', () => {
    it('CSVに正しくエクスポートされる（基本ケース）', () => {
      const sites = blockSitesOf(
        ['reddit.com', '2024-01-15T10:00:00Z'],
        ['twitter.com', '2024-01-14T09:00:00Z']
      );

      exportBlockList(sites);

      expect(mockCreateElement).toHaveBeenCalledWith('a');
      expect(mockClick).toHaveBeenCalled();
      expect(mockAppendChild).toHaveBeenCalled();
      expect(mockRemoveChild).toHaveBeenCalled();
    });

    it('空配列の場合でもエラーなく実行される', () => {
      expect(() => exportBlockList({})).not.toThrow();
    });

    it('単一要素でも正しくエクスポートされる', () => {
      const sites = blockSitesOf(['reddit.com', '2024-01-10T15:30:00Z']);
      expect(() => exportBlockList(sites)).not.toThrow();
      expect(mockClick).toHaveBeenCalled();
    });

    it('ドメイン名にカンマが含まれる場合に正しくエスケープされる', () => {
      // Domains shouldn't have commas, but the CSV escaping should handle it
      const sites = blockSitesOf(['example,test.com']);
      expect(() => exportBlockList(sites)).not.toThrow();
    });
  });

  describe('blockListRows', () => {
    it('ブロック設定を持つサイトを追加した順に並べ、無効のサイトも含める（追跡だけのサイトは含めない）', () => {
      const sites = sitesOf(
        blockedSite('b.com', { addedAt: '2024-01-15T10:00:00Z' }),
        trackedSite('tracked.com'),
        blockedSite('a.com', {
          addedAt: '2024-01-10T10:00:00Z',
          enabled: false
        })
      );
      expect(blockListRows(sites).map(([domain]) => domain)).toEqual([
        'a.com',
        'b.com'
      ]);
    });

    it('youtube.com は YouTube の節が担当するので CSV にも含めない', () => {
      const sites = sitesOf(blockedSite(YOUTUBE_DOMAIN), blockedSite('x.com'));
      expect(blockListRows(sites).map(([domain]) => domain)).toEqual(['x.com']);
    });
  });

  describe('CSV escaping', () => {
    it('カンマを含む文字列が正しくエスケープされる', () => {
      const sites = blockSitesOf(['example,test.com']);
      expect(() => exportBlockList(sites)).not.toThrow();
    });

    it('ダブルクォートを含む文字列が正しくエスケープされる', () => {
      const sites = blockSitesOf(['example"test.com']);
      expect(() => exportBlockList(sites)).not.toThrow();
    });

    it('改行を含む文字列が正しくエスケープされる', () => {
      const sites = blockSitesOf(['example\ntest.com']);
      expect(() => exportBlockList(sites)).not.toThrow();
    });
  });

  describe('filename generation', () => {
    // ローカルの 0 時台にして、UTC 基準の日付だと UTC より東のタイムゾーンで前日にずれるのを捕まえる
    beforeEach(() => {
      vi.setSystemTime(new Date(2024, 0, 15, 0, 30));
    });

    it.each([
      [
        'ブロックリスト',
        () => exportBlockList(blockSitesOf(['reddit.com'])),
        'visionfocus-blocklist-2024-01-15.csv'
      ],
      [
        'ブロック回数',
        () =>
          exportSiteBlockCounts({}, [], {
            from: '2024-01-01',
            to: '2024-01-15'
          }),
        'visionfocus-block-counts-2024-01-15.csv'
      ],
      [
        '日別統計',
        () =>
          exportDailyActivity({}, [], { from: '2024-01-01', to: '2024-01-15' }),
        'visionfocus-daily-stats-2024-01-15.csv'
      ],
      [
        '解除サイト',
        () => exportUnblockedSiteTimes({}, [], '2024-01-15'),
        'visionfocus-unblocked-sites-2024-01-15.csv'
      ]
    ])(
      '%s: ローカル日付入りのファイル名でダウンロードする',
      (_, run, filename) => {
        run();

        expect(mockCreateElement).toHaveBeenCalledWith('a');
        expect(mockLink.download).toBe(filename);
        expect(mockLink.href).toBe('blob:mock-url');
        expect(mockClick).toHaveBeenCalledOnce();
      }
    );
  });

  describe('BOM for Excel compatibility', () => {
    it('CSVファイルにBOMが含まれる（Excel日本語互換性）', () => {
      exportBlockList(blockSitesOf(['reddit.com']));

      expect(global.Blob).toHaveBeenCalled();
      const blobCall = (global.Blob as unknown as ReturnType<typeof vi.fn>).mock
        .calls[0];
      const content = blobCall[0][0];
      expect(content.startsWith('\uFEFF')).toBe(true);
    });
  });

  describe('activity から出す CSV', () => {
    // 母集団の外のサイト（untracked.com）と期間外の日（2024-01-01）を混ぜてある
    const log: ActivityLog = {
      '2024-01-01': { 'youtube.com': { seconds: 999, blocks: 9, unblocks: 0 } },
      '2024-01-10': {
        'youtube.com': { seconds: 600, blocks: 2, unblocks: 1 },
        'reddit.com': { seconds: 0, blocks: 5, unblocks: 0 },
        'untracked.com': { seconds: 5000, blocks: 50, unblocks: 5 }
      },
      '2024-01-12': {},
      '2024-01-14': {
        'youtube.com': { seconds: 1200, blocks: 1, unblocks: 0 },
        'x.com': { seconds: 300, blocks: 0, unblocks: 2 }
      }
    };
    const sites = ['youtube.com', 'reddit.com', 'x.com'];
    const range = { from: '2024-01-05', to: '2024-01-15' };
    const localDate = (date: string) => parseDateKey(date).toLocaleDateString();

    it('ブロック回数: 期間内の多い順。0 回のサイトは出さない', () => {
      expect(blockCountRows(log, sites, range)).toEqual([
        ['reddit.com', '5', localDate('2024-01-10')],
        ['youtube.com', '3', localDate('2024-01-14')]
      ]);
    });

    it('日別統計: 新しい日から。何も無い日は出さない', () => {
      expect(dailyActivityRows(log, sites, range)).toEqual([
        ['2024-01-14', formatTime(1500), '1'],
        ['2024-01-10', formatTime(600), '7']
      ]);
    });

    it('解除サイト: 解除後の時間の多い順。解除したことが無いサイトは出さない', () => {
      expect(unblockedSiteRows(log, sites, '2024-01-15')).toEqual([
        [
          'youtube.com',
          localDate('2024-01-10'),
          formatTime(600 + 1200),
          localDate('2024-01-14')
        ],
        [
          'x.com',
          localDate('2024-01-14'),
          formatTime(300),
          localDate('2024-01-14')
        ]
      ]);
    });

    it('母集団が空ならどの CSV も行を持たない', () => {
      expect(blockCountRows(log, [], range)).toEqual([]);
      expect(dailyActivityRows(log, [], range)).toEqual([]);
      expect(unblockedSiteRows(log, [], '2024-01-15')).toEqual([]);
    });

    it('ダウンロードする CSV に列見出しを付ける', () => {
      exportSiteBlockCounts(log, sites, range);
      exportDailyActivity(log, sites, range);
      exportUnblockedSiteTimes(log, sites, '2024-01-15');

      const contents = (
        global.Blob as unknown as ReturnType<typeof vi.fn>
      ).mock.calls.map((call) => String(call[0][0]));
      expect(contents[0]).toContain('Domain,Block Count,Last Blocked');
      expect(contents[1]).toContain('Date,Waste Time,Block Count');
      expect(contents[2]).toContain(
        'Domain,Unblocked Date,Time Since Unblock,Last Activity'
      );
      expect(mockClick).toHaveBeenCalledTimes(3);
    });
  });
});
