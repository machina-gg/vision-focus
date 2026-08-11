import { test, expect } from './fixtures/extension';
import { openExternalSite, openPopup } from './helpers/pages';
import {
  setupStorageViaSW,
  triggerBlockRuleRecompute,
  waitForBlockRules,
  waitForNoBlockRules
} from './helpers/sw';
import {
  clearStorageFromExtension,
  makeTimeLimitUsage,
  makeAnalytics,
  makeSettings,
  setStorageDataFromExtension,
  setSettingsFromExtension,
  getStorageDataFromExtension
} from './helpers/storage';
import { TEST_DOMAINS } from './helpers/constants';

/**
 * E2E Tests: 機能間相互作用
 *
 * Pause、Time Limit、Schedule、Analytics、パスワード保護の組み合わせ動作をテスト
 */

test.describe('Interaction - 機能間相互作用', () => {
  test.beforeEach(async ({ context, extensionId }) => {
    await clearStorageFromExtension(context, extensionId);
  });

  test('INT-001: Pause + Time Limit 同時有効時、Pause が優先される', async ({
    context,
    extensionId
  }) => {
    // Pause 有効 + Time Limit 超過
    await setSettingsFromExtension(context, extensionId, {
      language: 'en',
      paused: true, // Pause 有効
      blockList: [
        {
          id: '1',
          domain: TEST_DOMAINS.example,
          isWildcard: false,
          createdAt: new Date().toISOString(),
          enabled: true,
          timeLimit: {
            type: 'daily',
            limitSeconds: 1
          }
        }
      ]
    });

    await setStorageDataFromExtension(context, extensionId, 'timeLimitUsage', {
      [TEST_DOMAINS.example]: {
        daily: {
          used: 10, // 超過
          resetAt: new Date(Date.now() + 86400000).toISOString()
        },
        hourly: null
      }
    });

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // サイトにアクセス（Pause が優先されてアクセス可能）
    const unblockedPage = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.example}`
    );

    await unblockedPage.waitForLoadState('domcontentloaded');
    expect(unblockedPage.url()).toContain(TEST_DOMAINS.example);
    expect(unblockedPage.url()).not.toContain('newtab.html');

    await unblockedPage.close();
  });

  test('INT-002: Pause + Schedule 同時有効時、Pause が優先される', async ({
    context,
    extensionId
  }) => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay();

    // Pause 有効 + Schedule でブロック有効化時間帯
    await setSettingsFromExtension(context, extensionId, {
      language: 'en',
      paused: true, // Pause 有効
      blockList: [
        {
          id: '1',
          domain: TEST_DOMAINS.example,
          isWildcard: false,
          createdAt: new Date().toISOString(),
          enabled: true
        }
      ],
      schedules: [
        {
          id: 'schedule1',
          name: 'Block Now',
          enabled: true,
          days: [currentDay],
          startTime: `${String(currentHour).padStart(2, '0')}:00`,
          endTime: `${String(currentHour + 1).padStart(2, '0')}:00`,
          action: 'enable'
        }
      ]
    });

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // サイトにアクセス（Pause が優先されてアクセス可能）
    const unblockedPage = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.example}`
    );

    await unblockedPage.waitForLoadState('domcontentloaded');
    expect(unblockedPage.url()).toContain(TEST_DOMAINS.example);
    expect(unblockedPage.url()).not.toContain('newtab.html');

    await unblockedPage.close();
  });

  test('INT-003: Schedule 有効中でも Time Limit 未超過ならブロックされない', async ({
    context
  }) => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay();

    const settings = {
      blockList: [
        {
          id: '1',
          domain: TEST_DOMAINS.example,
          isWildcard: false,
          createdAt: new Date().toISOString(),
          enabled: true,
          timeLimit: { type: 'daily', limitSeconds: 60 }
        }
      ],
      schedules: [
        {
          id: 'schedule1',
          name: 'Block Now',
          enabled: true,
          days: [currentDay],
          startTime: `${String(currentHour).padStart(2, '0')}:00`,
          endTime: `${String(currentHour + 1).padStart(2, '0')}:00`,
          action: 'enable'
        }
      ]
    };

    // 未超過（30秒 / 上限60秒）。スケジュールは有効時間帯
    await setupStorageViaSW(context, {
      settings: makeSettings(settings),
      analytics: makeAnalytics({
        timeLimitUsage: makeTimeLimitUsage(TEST_DOMAINS.example, { daily: 30 })
      })
    });
    await triggerBlockRuleRecompute(context);

    // 時間制限つきサイトは「超過したときだけ」ブロック対象になる。
    // スケジュールが有効でも、未超過ならブロックしない
    await waitForNoBlockRules(context, [TEST_DOMAINS.example]);

    const allowedPage = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.example}`
    );
    expect(allowedPage.url()).toContain(TEST_DOMAINS.example);
    await allowedPage.close();

    // 超過させると、同じ設定でブロックされる
    await setupStorageViaSW(context, {
      settings: makeSettings(settings),
      analytics: makeAnalytics({
        timeLimitUsage: makeTimeLimitUsage(TEST_DOMAINS.example, { daily: 100 })
      })
    });
    await triggerBlockRuleRecompute(context);
    await waitForBlockRules(context, [TEST_DOMAINS.example]);

    const blockedPage = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.example}`
    );
    await blockedPage.waitForURL(`**newtab.html**`, { timeout: 10000 });
    await blockedPage.close();
  });

  test('INT-004: Pause + Time Limit + Schedule 同時有効時の優先順位', async ({
    context,
    extensionId
  }) => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay();

    // Pause 有効 + Time Limit 超過 + Schedule 有効
    await setSettingsFromExtension(context, extensionId, {
      language: 'en',
      paused: true, // Pause が最優先
      blockList: [
        {
          id: '1',
          domain: TEST_DOMAINS.example,
          isWildcard: false,
          createdAt: new Date().toISOString(),
          enabled: true,
          timeLimit: {
            type: 'daily',
            limitSeconds: 1
          }
        }
      ],
      schedules: [
        {
          id: 'schedule1',
          name: 'Block Now',
          enabled: true,
          days: [currentDay],
          startTime: `${String(currentHour).padStart(2, '0')}:00`,
          endTime: `${String(currentHour + 1).padStart(2, '0')}:00`,
          action: 'enable'
        }
      ]
    });

    await setStorageDataFromExtension(context, extensionId, 'timeLimitUsage', {
      [TEST_DOMAINS.example]: {
        daily: {
          used: 10, // 超過
          resetAt: new Date(Date.now() + 86400000).toISOString()
        },
        hourly: null
      }
    });

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // サイトにアクセス（Pause が最優先でアクセス可能）
    const unblockedPage = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.example}`
    );

    await unblockedPage.waitForLoadState('domcontentloaded');
    expect(unblockedPage.url()).toContain(TEST_DOMAINS.example);
    expect(unblockedPage.url()).not.toContain('newtab.html');

    await unblockedPage.close();
  });

  test('INT-005: Analytics Opt-Out 時に Unblock History も無効化', async ({
    context,
    extensionId
  }) => {
    // Opt-Out 状態
    await setSettingsFromExtension(context, extensionId, {
      language: 'en',
      paused: false,
      analyticsOptIn: { enabled: false, decidedAt: new Date().toISOString() }
    });

    await setStorageDataFromExtension(context, extensionId, 'unblockHistory', {
      entries: []
    });

    await setStorageDataFromExtension(context, extensionId, 'analytics', {
      dailyStats: {},
      siteStats: {}
    });

    // 外部サイトにアクセス
    const externalPage = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.example}`
    );

    await externalPage.waitForLoadState('domcontentloaded');
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Unblock History が記録されないことを確認
    const unblockHistory = (await getStorageDataFromExtension(
      context,
      extensionId,
      'unblockHistory'
    )) as any;

    expect(unblockHistory.entries.length).toBe(0);

    await externalPage.close();
  });

  test('INT-006: パスワード保護 + Pause トグル の認証フロー', async ({
    context,
    extensionId
  }) => {
    // パスワード保護を有効化
    await setSettingsFromExtension(context, extensionId, {
      language: 'en',
      paused: false,
      password: {
        enabled: true,
        passwordHash:
          '1b4f0e9851971998e732078544c96b36c3d01cedf7caa332359d6f1d83567014' // SHA-256("test1234")
      }
    });

    // Popup を開く
    const popupPage = await openPopup(context, extensionId);

    // Pause トグルをクリック
    const pauseToggle = popupPage.locator('[role="switch"]');
    await pauseToggle.click();

    // パスワードモーダルが表示されることを確認
    const passwordModal = popupPage.locator('[role="dialog"], .modal');
    await passwordModal.waitFor({ state: 'visible', timeout: 3000 });

    // パスワード入力フィールドが表示されることを確認
    const passwordInput = passwordModal.locator('input[type="password"]');
    expect(await passwordInput.isVisible()).toBeTruthy();

    await popupPage.close();
  });

  test('INT-007: パスワード保護 + ブロック解除 の認証フロー', async ({
    context,
    extensionId
  }) => {
    // パスワード保護を有効化
    await setSettingsFromExtension(context, extensionId, {
      language: 'en',
      paused: false,
      password: {
        enabled: true,
        passwordHash:
          '1b4f0e9851971998e732078544c96b36c3d01cedf7caa332359d6f1d83567014'
      },
      blockList: [
        {
          id: '1',
          domain: TEST_DOMAINS.example,
          isWildcard: false,
          createdAt: new Date().toISOString(),
          enabled: true
        }
      ]
    });

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // ブロックされたサイトにアクセス
    const blockedPage = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.example}`
    );

    await blockedPage.waitForURL(`**newtab.html**`, { timeout: 10000 });

    // newtab.html でブロック解除ボタンをクリック
    const unblockButton = blockedPage.locator(
      'button:has-text("Unblock"), button:has-text("解除")'
    );
    if (await unblockButton.isVisible()) {
      await unblockButton.click();

      // パスワードモーダルが表示されることを確認
      const passwordModal = blockedPage.locator('[role="dialog"], .modal');
      await passwordModal.waitFor({ state: 'visible', timeout: 3000 });

      const passwordInput = passwordModal.locator('input[type="password"]');
      expect(await passwordInput.isVisible()).toBeTruthy();
    }

    await blockedPage.close();
  });
});
