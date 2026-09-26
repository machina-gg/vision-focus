import { test, expect } from './fixtures/extension';
import { openExternalSite, openOptions, openPopup } from './helpers/pages';
import {
  getTodayActivityViaSW,
  setupStorageViaSW,
  triggerBlockRuleRecompute,
  waitForBlockRules,
  waitForNoBlockRules
} from './helpers/sw';
import {
  clearStorageFromExtension,
  makeActivity,
  makeSettings,
  makeUnblockHistory,
  setStorageDataFromExtension,
  setSettingsFromExtension,
  getStorageData
} from './helpers/storage';
import { TEST_DATA, TEST_DOMAINS, SELECTORS } from './helpers/constants';

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

    // 使用実績は activity の今日の行（サイトキーごとの表示秒数）に入る
    await setStorageDataFromExtension(
      context,
      extensionId,
      'activity',
      makeActivity([[TEST_DOMAINS.example, { seconds: 10 }]]) // 超過
    );

    // 実装と同じ経路（check-schedule アラーム）で再計算させ、
    // Pause 中はルールが 1 件も作られないことを確かめる
    await triggerBlockRuleRecompute(context);
    await waitForNoBlockRules(context, [TEST_DOMAINS.example]);

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
          endTime: `${String(currentHour + 1).padStart(2, '0')}:00`
        }
      ]
    });

    // 実装と同じ経路（check-schedule アラーム）で再計算させ、
    // Pause 中はルールが 1 件も作られないことを確かめる
    await triggerBlockRuleRecompute(context);
    await waitForNoBlockRules(context, [TEST_DOMAINS.example]);

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
          timeLimit: { type: 'daily' as const, limitSeconds: 60 }
        }
      ],
      schedules: [
        {
          id: 'schedule1',
          name: 'Block Now',
          enabled: true,
          days: [currentDay],
          startTime: `${String(currentHour).padStart(2, '0')}:00`,
          endTime: `${String(currentHour + 1).padStart(2, '0')}:00`
        }
      ]
    };

    // 未超過（30秒 / 上限60秒）。スケジュールは有効時間帯
    await setupStorageViaSW(context, {
      settings: makeSettings(settings),
      activity: makeActivity([[TEST_DOMAINS.example, { seconds: 30 }]])
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
      activity: makeActivity([[TEST_DOMAINS.example, { seconds: 100 }]])
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
          endTime: `${String(currentHour + 1).padStart(2, '0')}:00`
        }
      ]
    });

    // 使用実績は activity の今日の行（サイトキーごとの表示秒数）に入る
    await setStorageDataFromExtension(
      context,
      extensionId,
      'activity',
      makeActivity([[TEST_DOMAINS.example, { seconds: 10 }]]) // 超過
    );

    // 実装と同じ経路（check-schedule アラーム）で再計算させ、
    // Pause 中はルールが 1 件も作られないことを確かめる
    await triggerBlockRuleRecompute(context);
    await waitForNoBlockRules(context, [TEST_DOMAINS.example]);

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

  // ⚠ analyticsOptIn が止めるのは GA4 への送信だけで、手元の集計は続く
  // （machina-gg/vision-focus#431 の判断）。解除後の滞在時間は
  // src/background/handlers/tracker-heartbeat.ts が analyticsOptIn を
  // 参照せずに記録する
  test('INT-005: Analytics Opt-Out でも解除後の滞在時間は記録される', async ({
    context
  }) => {
    // 記録は background の一定間隔のタイマーが 1 周してから入る
    test.setTimeout(90_000);

    await setupStorageViaSW(context, {
      // Opt-Out 状態
      settings: makeSettings({
        paused: false,
        analyticsOptIn: { enabled: false, decidedAt: new Date().toISOString() }
      }),
      // 追跡中のサイトだけが記録の対象になる（解除履歴の sites は
      // ドメインをキーにしたレコードで、entries という配列は実装に無い）
      unblockHistory: makeUnblockHistory([TEST_DOMAINS.example])
    });

    const externalPage = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.example}`
    );

    await externalPage.waitForLoadState('domcontentloaded');

    // 解除後の時間は事実の表の滞在秒数から導出される。
    // 読み出しは SW 経由で行う（拡張機能のページを開くと前面のタブが
    // 入れ替わり、コンテンツスクリプトの heartbeat が止まる）
    await expect
      .poll(
        async () =>
          (await getTodayActivityViaSW(context, TEST_DOMAINS.example))
            ?.seconds ?? 0,
        { timeout: 60_000 }
      )
      .toBeGreaterThan(0);

    await externalPage.close();
  });

  test('INT-006: パスワード保護 + Pause トグル の認証フロー', async ({
    context,
    extensionId
  }) => {
    // パスワード保護を有効化
    // ハッシュは TEST_DATA の値を使う（SHA-256("test1234")）。
    // 入力値と対応しないハッシュを直書きすると、認証が通らないことに
    // 気付けないまま「モーダルが出た」だけの検査になる
    await setSettingsFromExtension(context, extensionId, {
      paused: false,
      password: {
        enabled: true,
        passwordHash: TEST_DATA.password.validHash
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
    // パスワード保護を有効化。
    // ハッシュは TEST_DATA の値を使う（SHA-256("test1234")）。
    // 入力値と対応しないハッシュを直書きすると、認証が通らないことに
    // 気付けないまま「モーダルが出た」だけの検査になる
    await setSettingsFromExtension(context, extensionId, {
      paused: false,
      password: {
        enabled: true,
        passwordHash: TEST_DATA.password.validHash
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

    // ブロック解除は Options のブロックリストで行う。
    // newtab には解除の UI が無い（src/entrypoints/newtab/ に解除の導線は無く、
    // 解除は BlocklistTab の削除・無効化だけ）
    const optionsPage = await openOptions(context, extensionId, 'blocklist');

    await expect(
      optionsPage.locator(SELECTORS.options.itemDomain).first()
    ).toContainText(TEST_DOMAINS.example);

    // 削除ボタンをクリックするとパスワードモーダルが開く。
    // パスワード保護時は長押しの Unblock 確認モーダルではなくこちらが出る
    // （src/components/options/BlocklistTab.tsx の handleRemoveClick）
    await optionsPage.locator(SELECTORS.options.deleteButton).first().click();

    const passwordModal = optionsPage.locator(SELECTORS.modal.passwordModal);
    await expect(passwordModal).toBeVisible();

    const passwordInput = passwordModal.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();

    // 正しいパスワードを入力して確定すると削除が実行される
    await passwordInput.fill(TEST_DATA.password.valid);
    await optionsPage.locator(SELECTORS.modal.passwordConfirmButton).click();

    await expect(passwordModal).toBeHidden();
    await expect(optionsPage.locator(SELECTORS.options.listItem)).toHaveCount(
      0
    );

    // 保存済みのブロックリストからも消える
    await expect
      .poll(async () => {
        const settings = await getStorageData(optionsPage, 'settings');
        return settings?.blockList?.length;
      })
      .toBe(0);

    await optionsPage.close();
  });
});
