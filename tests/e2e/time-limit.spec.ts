import { test, expect } from './fixtures/extension';
import { openExternalSite, openOptions, openPopup } from './helpers/pages';
import {
  makeSettings,
  makeActivity,
  clearStorageFromExtension
} from './helpers/storage';
import { TEST_DOMAINS } from './helpers/constants';
import {
  getBlockRuleFilters,
  setupStorageViaSW,
  triggerBlockRuleRecompute,
  waitForBlockRules,
  waitForNoBlockRules
} from './helpers/sw';

/**
 * E2E Tests: Time Limit 機能
 *
 * Daily Time Limit、リセット、超過時のリダイレクトをテスト
 */

test.describe('TimeLimit - Time Limit 機能', () => {
  test.beforeEach(async ({ context, extensionId }) => {
    await clearStorageFromExtension(context, extensionId);
  });

  test('TL-003: Time Limit 超過時に newtab.html へリダイレクトされる', async ({
    context
  }) => {
    // 使用実績（activity の今日の行）と設定を SW 経由でまとめて書く。
    // options を開いて書くと、アプリが state を書き戻して上書きしたり、
    // 時間制限値をプリセットに丸めたりするため、意図した状態にならない
    await setupStorageViaSW(context, {
      settings: makeSettings({
        blockList: [
          {
            id: '1',
            domain: TEST_DOMAINS.example,
            isWildcard: false,
            createdAt: new Date().toISOString(),
            enabled: true,
            timeLimit: { type: 'daily', limitSeconds: 60 }
          }
        ]
      }),
      activity: makeActivity([
        [TEST_DOMAINS.example, { seconds: 100 }] // 60秒を超過
      ])
    });

    // 超過判定は activity を見るが、activity の変更は再計算のトリガーに
    // ならない。実装と同じ経路（check-schedule アラーム）で再計算させる
    await triggerBlockRuleRecompute(context);
    await waitForBlockRules(context, [TEST_DOMAINS.example]);

    const blockedPage = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.example}`
    );

    await blockedPage.waitForURL(`**newtab.html**`, { timeout: 10000 });
    expect(blockedPage.url()).toContain('newtab.html');

    // 新規アクセスは declarativeNetRequest がリダイレクトするため、
    // reason クエリは付かない（付くのは開いているタブを
    // blockExistingTabs が飛ばす場合のみ）
    await blockedPage.close();
  });

  // 日付が変わったときの扱いは TL-009 で検証する（前日の行だけがある状態で
  // ルールを再計算させる）。

  test('TL-006: 残り時間がポップアップで表示される', async ({
    context,
    extensionId
  }) => {
    await setupStorageViaSW(context, {
      settings: makeSettings({
        blockList: [
          {
            id: '1',
            domain: TEST_DOMAINS.example,
            isWildcard: false,
            createdAt: new Date().toISOString(),
            enabled: true,
            timeLimit: { type: 'daily', limitSeconds: 60 }
          }
        ]
      }),
      activity: makeActivity([[TEST_DOMAINS.example, { seconds: 30 }]])
    });

    // 外部サイトを開いてからポップアップを開く
    const sitePage = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.example}`
    );
    const popupPage = await openPopup(context, extensionId);

    // ポップアップを開いた時点ではポップアップ自身がアクティブタブに
    // なってしまうため、サイトのタブをアクティブに戻してから
    // ポップアップを reload してドメイン取得をやり直させる
    await sitePage.bringToFront();
    await popupPage.reload();
    await popupPage.waitForLoadState('domcontentloaded');

    // reload で拾えなくても 10 秒ポーリングで拾えるよう timeout を長めに取る
    await expect(
      popupPage.locator('[data-testid="time-limit-badge"]')
    ).toBeVisible({ timeout: 15_000 });

    await popupPage.close();
    await sitePage.close();
  });

  test('TL-007: Time Limit の残り時間がブロックリストに表示される', async ({
    context,
    extensionId
  }) => {
    // 使用状況は Analytics タブではなく、ブロックリストの各項目に
    // 残り時間バッジとして出る（src/components/options/blocklist/TimeLimitEditor.tsx）
    await setupStorageViaSW(context, {
      settings: makeSettings({
        blockList: [
          {
            id: '1',
            domain: TEST_DOMAINS.example,
            isWildcard: false,
            createdAt: new Date().toISOString(),
            enabled: true,
            timeLimit: { type: 'daily', limitSeconds: 300 }
          }
        ]
      }),
      activity: makeActivity([[TEST_DOMAINS.example, { seconds: 60 }]])
    });

    const optionsPage = await openOptions(context, extensionId, 'blocklist');

    const badge = optionsPage.locator('[data-testid="time-limit-badge"]');
    await expect(badge).toBeVisible();
    await expect(badge).toHaveAttribute('data-state', 'remaining');

    await optionsPage.close();
  });

  test('TL-008: Pause 有効中は Time Limit 超過してもブロックされない', async ({
    context
  }) => {
    await setupStorageViaSW(context, {
      settings: makeSettings({
        paused: true, // Pause が最優先
        blockList: [
          {
            id: '1',
            domain: TEST_DOMAINS.example,
            isWildcard: false,
            createdAt: new Date().toISOString(),
            enabled: true,
            timeLimit: { type: 'daily', limitSeconds: 60 }
          }
        ]
      }),
      activity: makeActivity([[TEST_DOMAINS.example, { seconds: 100 }]])
    });

    await triggerBlockRuleRecompute(context);

    // Pause 中はルールが 1 件も作られない
    await waitForNoBlockRules(context, [TEST_DOMAINS.example]);

    const page = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.example}`
    );
    expect(page.url()).toContain(TEST_DOMAINS.example);
    expect(page.url()).not.toContain('newtab.html');
    await page.close();
  });

  test('TL-009: Daily の使用実績は日付が変わるとリセットされる', async ({
    context
  }) => {
    // 前日（ローカル日付）の行だけが上限を超えている状態を作る。
    // 使用量は今日の行だけを読むので、リセット処理を経ずに今日は 0 秒になる
    await setupStorageViaSW(context, {
      settings: makeSettings({
        blockList: [
          {
            id: '1',
            domain: TEST_DOMAINS.example,
            isWildcard: false,
            createdAt: new Date().toISOString(),
            enabled: true,
            timeLimit: { type: 'daily', limitSeconds: 60 }
          },
          // 再計算が走ったことの目印。これが無いとルールが 0 件のままになり、
          // 「今日は超過していないから載らない」と「まだ再計算されていない」を区別できない
          {
            id: '2',
            domain: TEST_DOMAINS.reddit,
            isWildcard: false,
            createdAt: new Date().toISOString(),
            enabled: true
          }
        ]
      }),
      // 3 つ目の要素は「何日前の行か」
      activity: makeActivity([[TEST_DOMAINS.example, { seconds: 100 }, 1]])
    });

    // 今日は超過していないため、実装と同じ経路（check-schedule アラーム）で
    // 再計算してもルールに載らず、アクセスできる
    await triggerBlockRuleRecompute(context);
    await waitForBlockRules(context, [TEST_DOMAINS.reddit]);
    const filters = await getBlockRuleFilters(context);
    expect(filters.some((f) => f.includes(TEST_DOMAINS.example))).toBe(false);

    const page = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.example}`
    );
    expect(page.url()).toContain(TEST_DOMAINS.example);
    await page.close();
  });

  test('TL-011: 複数サイトで異なる Time Limit が同時に動作する', async ({
    context
  }) => {
    await setupStorageViaSW(context, {
      settings: makeSettings({
        blockList: [
          {
            id: '1',
            domain: TEST_DOMAINS.example,
            isWildcard: false,
            createdAt: new Date().toISOString(),
            enabled: true,
            timeLimit: { type: 'daily', limitSeconds: 60 }
          },
          {
            id: '2',
            domain: TEST_DOMAINS.reddit,
            isWildcard: false,
            createdAt: new Date().toISOString(),
            enabled: true,
            timeLimit: { type: 'daily', limitSeconds: 300 }
          }
        ]
      }),
      // example.com は超過（70/60）、reddit.com は未超過（10/300）
      activity: makeActivity([
        [TEST_DOMAINS.example, { seconds: 70 }],
        [TEST_DOMAINS.reddit, { seconds: 10 }]
      ])
    });

    await triggerBlockRuleRecompute(context);
    await waitForBlockRules(context, [TEST_DOMAINS.example]);

    // 超過している example.com はブロックされる
    const blockedPage = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.example}`
    );
    await blockedPage.waitForURL(`**newtab.html**`, { timeout: 10000 });
    await blockedPage.close();

    // 未超過の reddit.com はアクセスできる
    await waitForNoBlockRules(context, [TEST_DOMAINS.reddit]);
    const unblockedPage = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.reddit}`
    );
    expect(unblockedPage.url()).toContain(TEST_DOMAINS.reddit);
    expect(unblockedPage.url()).not.toContain('newtab.html');
    await unblockedPage.close();
  });
});
