import { describe, expect, it, vi, beforeEach } from 'vitest';

// storage / blockService / chromeApi をモックし、chrome API 呼び出しを検証する
vi.mock('~/lib/storage', () => ({
  getSettings: vi.fn()
}));

vi.mock('~/lib/blockService', () => ({
  getBlockState: vi.fn(),
  getActiveBlockedDomains: vi.fn(),
  findBlockItemForDomain: vi.fn()
}));

vi.mock('~/lib/chromeApi', () => ({
  isExtensionContextValid: vi.fn(() => true)
}));

import { getSettings } from '~/lib/storage';
import { getBlockState, getActiveBlockedDomains } from '~/lib/blockService';
import { isExtensionContextValid } from '~/lib/chromeApi';
import {
  updateBlockRules,
  shouldBlockUrl,
  blockExistingTabs
} from '../blocker';
import { DEFAULT_SETTINGS } from '~/types/storage';
import { BLOCKER_CONFIG } from '~/constants/limits';

interface UpdateRulesArg {
  removeRuleIds: number[];
  addRules: chrome.declarativeNetRequest.Rule[];
}

/** chrome API のグローバルモックを構築する */
function setupChrome(overrides: Record<string, unknown> = {}) {
  const chromeMock = {
    declarativeNetRequest: {
      getDynamicRules: vi.fn().mockResolvedValue([]),
      updateDynamicRules: vi.fn().mockResolvedValue(undefined),
      // 実装が参照する enum 値
      RuleActionType: { REDIRECT: 'redirect' },
      ResourceType: { MAIN_FRAME: 'main_frame' }
    },
    tabs: {
      query: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue(undefined)
    },
    runtime: {
      id: 'test-extension-id',
      getURL: vi.fn(
        (path: string) =>
          `chrome-extension://test-id/${path.replace(/^\//, '')}`
      )
    },
    ...overrides
  };
  (globalThis as Record<string, unknown>).chrome = chromeMock;
  return chromeMock;
}

/** updateDynamicRules に渡された引数を取得する */
function lastUpdateRulesArg(
  chromeMock: ReturnType<typeof setupChrome>
): UpdateRulesArg {
  const calls = chromeMock.declarativeNetRequest.updateDynamicRules.mock.calls;
  return calls[calls.length - 1][0] as UpdateRulesArg;
}

describe('blocker', () => {
  let chromeMock: ReturnType<typeof setupChrome>;

  beforeEach(() => {
    vi.clearAllMocks();
    chromeMock = setupChrome();
    vi.mocked(getSettings).mockResolvedValue({ ...DEFAULT_SETTINGS });
    vi.mocked(getActiveBlockedDomains).mockResolvedValue([]);
    vi.mocked(isExtensionContextValid).mockReturnValue(true);
  });

  describe('updateBlockRules', () => {
    it('ブロック対象ドメインからリダイレクトルールを生成する', async () => {
      vi.mocked(getActiveBlockedDomains).mockResolvedValue(['example.com']);

      await updateBlockRules();

      const arg = lastUpdateRulesArg(chromeMock);
      expect(arg.addRules).toHaveLength(1);
      expect(arg.addRules[0]).toMatchObject({
        id: BLOCKER_CONFIG.RULE_ID_OFFSET,
        priority: 1,
        action: {
          type: 'redirect',
          redirect: { extensionPath: '/newtab.html' }
        },
        condition: {
          urlFilter: '||example.com',
          resourceTypes: ['main_frame']
        }
      });
    });

    it('ルール ID は RULE_ID_OFFSET から連番で割り当てる', async () => {
      vi.mocked(getActiveBlockedDomains).mockResolvedValue([
        'a.com',
        'b.com',
        'c.com'
      ]);

      await updateBlockRules();

      const arg = lastUpdateRulesArg(chromeMock);
      expect(arg.addRules.map((r) => r.id)).toEqual([
        BLOCKER_CONFIG.RULE_ID_OFFSET,
        BLOCKER_CONFIG.RULE_ID_OFFSET + 1,
        BLOCKER_CONFIG.RULE_ID_OFFSET + 2
      ]);
    });

    it('ワイルドカードドメインは *. を除いた urlFilter にする', async () => {
      vi.mocked(getActiveBlockedDomains).mockResolvedValue(['*.example.com']);

      await updateBlockRules();

      const arg = lastUpdateRulesArg(chromeMock);
      expect(arg.addRules[0].condition?.urlFilter).toBe('||example.com');
    });

    it('既存の動的ルールをすべて削除対象に含める', async () => {
      chromeMock.declarativeNetRequest.getDynamicRules.mockResolvedValue([
        { id: 1000 },
        { id: 1001 }
      ]);
      vi.mocked(getActiveBlockedDomains).mockResolvedValue(['example.com']);

      await updateBlockRules();

      const arg = lastUpdateRulesArg(chromeMock);
      expect(arg.removeRuleIds).toEqual([1000, 1001]);
    });

    it('ブロック対象が無い場合は削除のみ行う', async () => {
      chromeMock.declarativeNetRequest.getDynamicRules.mockResolvedValue([
        { id: 1000 }
      ]);

      await updateBlockRules();

      const arg = lastUpdateRulesArg(chromeMock);
      expect(arg.removeRuleIds).toEqual([1000]);
      expect(arg.addRules).toEqual([]);
    });

    describe('一時停止中', () => {
      beforeEach(() => {
        vi.mocked(getSettings).mockResolvedValue({
          ...DEFAULT_SETTINGS,
          paused: true
        });
      });

      it('既存ルールを全削除し、新規ルールを追加しない', async () => {
        chromeMock.declarativeNetRequest.getDynamicRules.mockResolvedValue([
          { id: 1000 },
          { id: 1001 }
        ]);

        await updateBlockRules();

        const arg = lastUpdateRulesArg(chromeMock);
        expect(arg.removeRuleIds).toEqual([1000, 1001]);
        expect(arg.addRules).toEqual([]);
      });

      it('ブロック対象の取得自体を行わない', async () => {
        await updateBlockRules();

        expect(getActiveBlockedDomains).not.toHaveBeenCalled();
      });
    });
  });

  describe('shouldBlockUrl', () => {
    it('ブロック状態と理由をそのまま返す', async () => {
      vi.mocked(getBlockState).mockResolvedValue({
        blocked: true,
        reason: 'time_limit_exceeded'
      });

      const result = await shouldBlockUrl('https://example.com');

      expect(result).toEqual({ blocked: true, reason: 'time_limit_exceeded' });
      expect(getBlockState).toHaveBeenCalledWith('https://example.com');
    });

    it('ブロック対象外なら blocked: false を返す', async () => {
      vi.mocked(getBlockState).mockResolvedValue({
        blocked: false,
        reason: null
      });

      const result = await shouldBlockUrl('https://example.com');

      expect(result).toEqual({ blocked: false, reason: null });
    });
  });

  describe('blockExistingTabs', () => {
    beforeEach(() => {
      vi.mocked(getBlockState).mockResolvedValue({
        blocked: false,
        reason: null
      });
    });

    it('拡張機能コンテキストが無効なら何もしない', async () => {
      vi.mocked(isExtensionContextValid).mockReturnValue(false);

      await blockExistingTabs();

      expect(chromeMock.tabs.query).not.toHaveBeenCalled();
    });

    it('ブロック対象のタブを newtab へリダイレクトする', async () => {
      chromeMock.tabs.query.mockResolvedValue([
        { id: 1, url: 'https://example.com/page' }
      ]);
      vi.mocked(getBlockState).mockResolvedValue({
        blocked: true,
        reason: null
      });

      await blockExistingTabs();

      expect(chromeMock.tabs.update).toHaveBeenCalledWith(1, {
        url: 'chrome-extension://test-id/newtab.html'
      });
    });

    it('ブロック理由をクエリパラメータで渡す', async () => {
      chromeMock.tabs.query.mockResolvedValue([
        { id: 1, url: 'https://example.com' }
      ]);
      vi.mocked(getBlockState).mockResolvedValue({
        blocked: true,
        reason: 'time_limit_exceeded'
      });

      await blockExistingTabs();

      expect(chromeMock.tabs.update).toHaveBeenCalledWith(1, {
        url: 'chrome-extension://test-id/newtab.html?reason=time_limit_exceeded'
      });
    });

    it('ブロック対象でないタブはリダイレクトしない', async () => {
      chromeMock.tabs.query.mockResolvedValue([
        { id: 1, url: 'https://example.com' }
      ]);

      await blockExistingTabs();

      expect(chromeMock.tabs.update).not.toHaveBeenCalled();
    });

    it.each([
      ['chrome:// ページ', 'chrome://settings'],
      ['拡張機能ページ', 'chrome-extension://test-id/options.html']
    ])('%s は判定対象から除外する', async (_label, url) => {
      chromeMock.tabs.query.mockResolvedValue([{ id: 1, url }]);

      await blockExistingTabs();

      expect(getBlockState).not.toHaveBeenCalled();
      expect(chromeMock.tabs.update).not.toHaveBeenCalled();
    });

    it.each([
      ['id が無いタブ', { url: 'https://example.com' }],
      ['url が無いタブ', { id: 1 }]
    ])('%s はスキップする', async (_label, tab) => {
      chromeMock.tabs.query.mockResolvedValue([tab]);

      await blockExistingTabs();

      expect(chromeMock.tabs.update).not.toHaveBeenCalled();
    });

    it('複数タブのうちブロック対象のみリダイレクトする', async () => {
      chromeMock.tabs.query.mockResolvedValue([
        { id: 1, url: 'https://blocked.com' },
        { id: 2, url: 'https://allowed.com' },
        { id: 3, url: 'chrome://settings' }
      ]);
      vi.mocked(getBlockState).mockImplementation(async (url: string) =>
        url.includes('blocked.com')
          ? { blocked: true, reason: null }
          : { blocked: false, reason: null }
      );

      await blockExistingTabs();

      expect(chromeMock.tabs.update).toHaveBeenCalledOnce();
      expect(chromeMock.tabs.update).toHaveBeenCalledWith(1, {
        url: 'chrome-extension://test-id/newtab.html'
      });
    });
  });
});
