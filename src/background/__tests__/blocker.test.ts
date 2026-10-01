import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('~/lib/blockService', () => ({
  getBlockState: vi.fn(),
  getRuleTargets: vi.fn()
}));

vi.mock('~/lib/chromeApi', () => ({
  isExtensionContextValid: vi.fn(() => true)
}));

vi.mock('~/lib/blockRecordService', () => ({
  recordBlockedDomain: vi.fn()
}));

import { getBlockState, getRuleTargets } from '~/lib/blockService';
import { isExtensionContextValid } from '~/lib/chromeApi';
import { recordBlockedDomain } from '~/lib/blockRecordService';
import {
  updateBlockRules,
  blockExistingTabs,
  getRedirectedHosts
} from '../blocker';
import { BLOCKER_CONFIG } from '~/constants/limits';
import { itemAt, lastItem } from '~/test/items';

interface UpdateRulesArg {
  removeRuleIds: number[];
  addRules: chrome.declarativeNetRequest.Rule[];
}

function setupChrome(overrides: Record<string, unknown> = {}) {
  const chromeMock = {
    declarativeNetRequest: {
      getDynamicRules: vi.fn().mockResolvedValue([]),
      updateDynamicRules: vi.fn().mockResolvedValue(undefined),
      RuleActionType: { REDIRECT: 'redirect', ALLOW: 'allow' },
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

function givenTargets(redirect: string[], allow: string[] = []): void {
  vi.mocked(getRuleTargets).mockResolvedValue({ redirect, allow });
}

function lastUpdateRulesArg(
  chromeMock: ReturnType<typeof setupChrome>
): UpdateRulesArg {
  const calls = chromeMock.declarativeNetRequest.updateDynamicRules.mock.calls;
  return lastItem(calls)[0] as UpdateRulesArg;
}

describe('blocker', () => {
  let chromeMock: ReturnType<typeof setupChrome>;

  beforeEach(() => {
    vi.clearAllMocks();
    chromeMock = setupChrome();
    vi.mocked(getRuleTargets).mockResolvedValue({ redirect: [], allow: [] });
    vi.mocked(isExtensionContextValid).mockReturnValue(true);
  });

  describe('updateBlockRules', () => {
    it('ブロック対象ドメインからリダイレクトルールを生成する', async () => {
      givenTargets(['example.com']);

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
          requestDomains: ['example.com'],
          resourceTypes: ['main_frame']
        }
      });
    });

    it('許可サイトごとに優先度 2 の allow ルールを作り、redirect（優先度 1）より優先させる', async () => {
      givenTargets(['youtube.com'], ['music.youtube.com', 'mail.google.com']);

      await updateBlockRules();

      const arg = lastUpdateRulesArg(chromeMock);
      expect(arg.addRules).toHaveLength(3);
      expect(itemAt(arg.addRules, 0)).toMatchObject({
        priority: 1,
        action: { type: 'redirect' },
        condition: { requestDomains: ['youtube.com'] }
      });
      const allowRules = arg.addRules.filter(
        (rule) => rule.action.type === 'allow'
      );
      expect(allowRules).toEqual([
        {
          id: BLOCKER_CONFIG.RULE_ID_OFFSET + 1,
          priority: 2,
          action: { type: 'allow' },
          condition: {
            requestDomains: ['music.youtube.com'],
            resourceTypes: ['main_frame']
          }
        },
        {
          id: BLOCKER_CONFIG.RULE_ID_OFFSET + 2,
          priority: 2,
          action: { type: 'allow' },
          condition: {
            requestDomains: ['mail.google.com'],
            resourceTypes: ['main_frame']
          }
        }
      ]);
    });

    it('allow ルールは許可サイトの分だけ作る（転送するサイトが無くても作る）', async () => {
      givenTargets([], ['music.youtube.com']);

      await updateBlockRules();

      const arg = lastUpdateRulesArg(chromeMock);
      expect(arg.addRules.map((rule) => rule.action.type)).toEqual(['allow']);
    });

    it('ルール ID は RULE_ID_OFFSET から連番で割り当てる', async () => {
      givenTargets(['a.com', 'b.com'], ['c.com']);

      await updateBlockRules();

      const arg = lastUpdateRulesArg(chromeMock);
      expect(arg.addRules.map((r) => r.id)).toEqual([
        BLOCKER_CONFIG.RULE_ID_OFFSET,
        BLOCKER_CONFIG.RULE_ID_OFFSET + 1,
        BLOCKER_CONFIG.RULE_ID_OFFSET + 2
      ]);
    });

    it('サイトキーをそのまま requestDomains にし、urlFilter は使わない', async () => {
      givenTargets(['example.com']);

      await updateBlockRules();

      const { condition } = itemAt(lastUpdateRulesArg(chromeMock).addRules, 0);
      expect(condition.requestDomains).toEqual(['example.com']);
      expect(condition.urlFilter).toBeUndefined();
    });

    it('既存の動的ルールをすべて削除対象に含める', async () => {
      chromeMock.declarativeNetRequest.getDynamicRules.mockResolvedValue([
        { id: 1000 },
        { id: 1001 }
      ]);
      givenTargets(['example.com']);

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
  });

  describe('getRedirectedHosts', () => {
    it('転送ルールの requestDomains だけを返す（許可サイトのルールは含めない）', async () => {
      chromeMock.declarativeNetRequest.getDynamicRules.mockResolvedValue([
        {
          id: 1000,
          action: { type: 'redirect' },
          condition: { requestDomains: ['example.com'] }
        },
        {
          id: 1001,
          action: { type: 'allow' },
          condition: { requestDomains: ['music.youtube.com'] }
        },
        {
          id: 1002,
          action: { type: 'redirect' },
          condition: { requestDomains: ['youtube.com'] }
        }
      ]);

      expect(await getRedirectedHosts()).toEqual([
        'example.com',
        'youtube.com'
      ]);
    });

    it('作り直したルールの転送先を読み戻せる', async () => {
      givenTargets(['example.com'], ['music.youtube.com']);
      await updateBlockRules();
      chromeMock.declarativeNetRequest.getDynamicRules.mockResolvedValue(
        lastUpdateRulesArg(chromeMock).addRules
      );

      expect(await getRedirectedHosts()).toEqual(['example.com']);
    });

    it('ルールが無ければ空を返す', async () => {
      expect(await getRedirectedHosts()).toEqual([]);
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
        reason: 'always_blocked'
      });

      await blockExistingTabs();

      expect(chromeMock.tabs.update).toHaveBeenCalledWith(1, {
        url: 'chrome-extension://test-id/newtab.html'
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

    it.each([['always_blocked' as const], ['time_limit_exceeded' as const]])(
      'リダイレクトするタブのドメインと理由（%s）をブロック記録に渡す',
      async (reason) => {
        chromeMock.tabs.query.mockResolvedValue([
          { id: 1, url: 'https://example.com/page' }
        ]);
        vi.mocked(getBlockState).mockResolvedValue({ blocked: true, reason });

        await blockExistingTabs();

        expect(recordBlockedDomain).toHaveBeenCalledWith('example.com', reason);
      }
    );

    it('理由は URL に付けず、ブロック画面へそのまま移す', async () => {
      chromeMock.tabs.query.mockResolvedValue([
        { id: 1, url: 'https://example.com' }
      ]);
      vi.mocked(getBlockState).mockResolvedValue({
        blocked: true,
        reason: 'time_limit_exceeded'
      });

      await blockExistingTabs();

      expect(chromeMock.tabs.update).toHaveBeenCalledWith(1, {
        url: 'chrome-extension://test-id/newtab.html'
      });
    });

    it('記録はリダイレクトより先に行う', async () => {
      chromeMock.tabs.query.mockResolvedValue([
        { id: 1, url: 'https://example.com/page' }
      ]);
      vi.mocked(getBlockState).mockResolvedValue({
        blocked: true,
        reason: 'always_blocked'
      });

      await blockExistingTabs();

      expect(
        vi.mocked(recordBlockedDomain).mock.invocationCallOrder[0]
      ).toBeLessThan(
        itemAt(chromeMock.tabs.update.mock.invocationCallOrder, 0)
      );
    });

    it('ブロック対象でないタブは記録しない', async () => {
      chromeMock.tabs.query.mockResolvedValue([
        { id: 1, url: 'https://example.com' }
      ]);

      await blockExistingTabs();

      expect(recordBlockedDomain).not.toHaveBeenCalled();
    });

    it('複数タブのうちブロック対象のみリダイレクトする', async () => {
      chromeMock.tabs.query.mockResolvedValue([
        { id: 1, url: 'https://blocked.com' },
        { id: 2, url: 'https://allowed.com' },
        { id: 3, url: 'chrome://settings' }
      ]);
      vi.mocked(getBlockState).mockImplementation(async (url: string) =>
        url.includes('blocked.com')
          ? { blocked: true, reason: 'always_blocked' }
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
