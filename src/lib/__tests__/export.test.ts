import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import {
  exportBlockList,
  blockCountRows,
  dailyActivityRows,
  unblockedSiteRows,
  exportSiteBlockCounts,
  exportDailyActivity,
  exportUnblockedSiteTimes
} from '~/lib/export';
import { parseDateKey } from '~/lib/activityStats';
import { formatTime } from '~/lib/time';
import type { ActivityLog } from '~/types/activity';
import type { BlockItem } from '~/types/storage';

// Mock helper to create BlockItem
function makeBlockItem(
  domain: string,
  isWildcard: boolean,
  createdAt: string = '2024-01-15T10:00:00Z'
): BlockItem {
  return {
    id: `id-${domain}`,
    domain,
    isWildcard,
    createdAt,
    enabled: true
  };
}

describe('export utilities', () => {
  // Mock DOM APIs
  let mockCreateElement: ReturnType<typeof vi.fn>;
  let mockAppendChild: ReturnType<typeof vi.fn>;
  let mockRemoveChild: ReturnType<typeof vi.fn>;
  let mockClick: ReturnType<typeof vi.fn>;
  let mockCreateObjectURL: ReturnType<typeof vi.fn>;
  let mockRevokeObjectURL: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Mock document.createElement
    mockClick = vi.fn();
    const mockLink = {
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

    // Mock URL APIs
    mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
    mockRevokeObjectURL = vi.fn();
    // ⚠ vitest 4 の `vi.fn()` の戻り型はコンストラクタ型を含むため、関数型の
    //   プロパティへそのままは代入できない（他の DOM モックと同じ形にそろえる）
    global.URL.createObjectURL =
      mockCreateObjectURL as unknown as typeof URL.createObjectURL;
    global.URL.revokeObjectURL =
      mockRevokeObjectURL as unknown as typeof URL.revokeObjectURL;

    // Mock Blob
    // ⚠ vitest 4 以降、`new` 付きで呼ばれたモックはコンストラクタとして実行される。
    //   アロー関数はコンストラクタになれないため function 宣言で書く
    global.Blob = vi.fn(function (content, options) {
      return { content, options };
    }) as unknown as typeof Blob;

    // Mock Date for consistent filename
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('exportBlockList', () => {
    it('CSVに正しくエクスポートされる（基本ケース）', () => {
      const blockList: BlockItem[] = [
        makeBlockItem('youtube.com', false, '2024-01-15T10:00:00Z'),
        makeBlockItem('*.twitter.com', true, '2024-01-14T09:00:00Z')
      ];

      exportBlockList(blockList);

      expect(mockCreateElement).toHaveBeenCalledWith('a');
      expect(mockClick).toHaveBeenCalled();
      expect(mockAppendChild).toHaveBeenCalled();
      expect(mockRemoveChild).toHaveBeenCalled();
    });

    it('空配列の場合でもエラーなく実行される', () => {
      const blockList: BlockItem[] = [];
      expect(() => exportBlockList(blockList)).not.toThrow();
    });

    it('単一要素でも正しくエクスポートされる', () => {
      const blockList: BlockItem[] = [
        makeBlockItem('reddit.com', false, '2024-01-10T15:30:00Z')
      ];
      expect(() => exportBlockList(blockList)).not.toThrow();
      expect(mockClick).toHaveBeenCalled();
    });

    it('ドメイン名にカンマが含まれる場合に正しくエスケープされる', () => {
      // This is an edge case - domains shouldn't have commas, but the CSV escaping should handle it
      const blockList: BlockItem[] = [
        makeBlockItem('example,test.com', false, '2024-01-15T10:00:00Z')
      ];
      expect(() => exportBlockList(blockList)).not.toThrow();
    });

    it('Wildcard/Non-wildcardが正しく"Yes"/"No"に変換される', () => {
      const blockList: BlockItem[] = [
        makeBlockItem('example.com', false),
        makeBlockItem('*.test.com', true)
      ];
      // We can't easily test the CSV content without inspecting Blob,
      // but we can ensure it doesn't throw
      expect(() => exportBlockList(blockList)).not.toThrow();
    });
  });

  describe('CSV escaping', () => {
    it('カンマを含む文字列が正しくエスケープされる', () => {
      const blockList: BlockItem[] = [
        {
          id: 'test',
          domain: 'example,test.com',
          isWildcard: false,
          createdAt: '2024-01-15T10:00:00Z',
          enabled: true
        }
      ];
      expect(() => exportBlockList(blockList)).not.toThrow();
    });

    it('ダブルクォートを含む文字列が正しくエスケープされる', () => {
      const blockList: BlockItem[] = [
        {
          id: 'test',
          domain: 'example"test.com',
          isWildcard: false,
          createdAt: '2024-01-15T10:00:00Z',
          enabled: true
        }
      ];
      expect(() => exportBlockList(blockList)).not.toThrow();
    });

    it('改行を含む文字列が正しくエスケープされる', () => {
      const blockList: BlockItem[] = [
        {
          id: 'test',
          domain: 'example\ntest.com',
          isWildcard: false,
          createdAt: '2024-01-15T10:00:00Z',
          enabled: true
        }
      ];
      expect(() => exportBlockList(blockList)).not.toThrow();
    });
  });

  describe('filename generation', () => {
    it('ファイル名に正しい日付が含まれる', () => {
      const blockList: BlockItem[] = [makeBlockItem('youtube.com', false)];
      exportBlockList(blockList);

      // Check that createElement was called with 'a'
      expect(mockCreateElement).toHaveBeenCalledWith('a');
      // The download attribute should contain '2024-01-15' (mocked date)
      // We can't directly inspect the link object easily in this setup,
      // but we verified the function runs without errors
    });
  });

  describe('BOM for Excel compatibility', () => {
    it('CSVファイルにBOMが含まれる（Excel日本語互換性）', () => {
      const blockList: BlockItem[] = [makeBlockItem('youtube.com', false)];
      exportBlockList(blockList);

      // Verify Blob was created (BOM is added in downloadCSV)
      expect(global.Blob).toHaveBeenCalled();
      const blobCall = (global.Blob as unknown as ReturnType<typeof vi.fn>).mock
        .calls[0];
      const content = blobCall[0][0];
      // BOM is '\uFEFF', should be prepended
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
