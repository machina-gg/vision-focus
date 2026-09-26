import { test, expect } from './fixtures/extension';

import { EXPORT_VERSION } from '~/lib/settingsExport';
import {
  openOptions,
  setupTestStorage,
  clearStorage,
  setStorageData,
  getStorageData,
  holdUnblockConfirm,
  makeAppSettings,
  makeDisplaySettings,
  makeVision,
  toggleAfter,
  SELECTORS,
  TEST_DATA,
  UI_TEXT,
  makeSites
} from './helpers';

test.describe('Options - Settings Tab', () => {
  test.beforeEach(async ({ context, extensionId }) => {
    const page = await openOptions(context, extensionId);
    await clearStorage(page);
    await setupTestStorage(page, {
      withGoal: true,
      withAnalyticsOptIn: true
    });
    await page.close();
  });

  test('OPT-SET01: 設定タブが表示される', async ({ context, extensionId }) => {
    const page = await openOptions(context, extensionId, 'settings');

    await expect(page.locator(SELECTORS.options.settingsTab)).toHaveAttribute(
      'aria-selected',
      'true'
    );

    await expect(
      page.locator(SELECTORS.settings.unblockProtectionSection)
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: UI_TEXT.notifications.heading })
    ).toBeVisible();
    await expect(
      page.locator(SELECTORS.settings.analyticsOptInToggle)
    ).toBeVisible();
    await expect(
      page.locator(SELECTORS.settings.exportSettingsButton)
    ).toBeVisible();

    await page.close();
  });

  test('OPT-SET02: パスワード設定セクションが表示される', async ({
    context,
    extensionId
  }) => {
    const page = await openOptions(context, extensionId, 'settings');

    const passwordSection = page.locator(SELECTORS.settings.passwordSection);
    await expect(passwordSection).toBeVisible();

    await expect(
      page.locator(SELECTORS.settings.passwordEnableToggle)
    ).toBeVisible();

    await page.close();
  });

  test('OPT-SET03: パスワードを設定できる', async ({
    context,
    extensionId
  }) => {
    const page = await openOptions(context, extensionId, 'settings');

    await page.locator(SELECTORS.settings.passwordEnableToggle).click();

    const fields = page.locator(SELECTORS.settings.passwordField);
    await expect(fields.first()).toBeVisible();

    await page.locator(SELECTORS.settings.passwordFieldNew).fill('test1234');
    await page
      .locator(SELECTORS.settings.passwordFieldConfirm)
      .fill('test1234');

    await page.locator(SELECTORS.settings.passwordFormSubmit).click();

    await expect(fields.first()).toBeHidden();
    await expect(
      page.locator(SELECTORS.settings.passwordEnableToggle)
    ).toHaveAttribute('aria-checked', 'true');

    const settings = await getStorageData(page, 'settings');
    expect(settings?.password?.enabled).toBe(true);
    expect(settings?.password?.passwordHash).toBeTruthy();

    await page.close();
  });

  test('OPT-SET04: パスワードを変更できる', async ({
    context,
    extensionId
  }) => {
    const setupPage = await openOptions(context, extensionId);
    await setupTestStorage(setupPage, {
      withGoal: true,
      withPassword: true,
      withAnalyticsOptIn: true
    });
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'settings');

    const changePasswordButton = page.locator(
      SELECTORS.settings.passwordChangeButton
    );
    await expect(changePasswordButton).toBeVisible();
    await changePasswordButton.click();

    const fields = page.locator(SELECTORS.settings.passwordField);
    await expect(fields).toHaveCount(3);
    await page
      .locator(SELECTORS.settings.passwordFieldCurrent)
      .fill(TEST_DATA.password.valid);
    await page.locator(SELECTORS.settings.passwordFieldNew).fill('newpass1234');
    await page
      .locator(SELECTORS.settings.passwordFieldConfirm)
      .fill('newpass1234');

    await page.locator(SELECTORS.settings.passwordFormSubmit).click();

    await expect(fields.first()).toBeHidden();
    const settings = await getStorageData(page, 'settings');
    expect(settings?.password?.enabled).toBe(true);
    expect(settings?.password?.passwordHash).not.toBe(
      TEST_DATA.password.validHash
    );

    await page.close();
  });

  test('OPT-SET05: パスワードを削除できる', async ({
    context,
    extensionId
  }) => {
    const setupPage = await openOptions(context, extensionId);
    await setupTestStorage(setupPage, {
      withGoal: true,
      withPassword: true,
      withAnalyticsOptIn: true
    });
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'settings');

    const toggle = page.locator(SELECTORS.settings.passwordEnableToggle);
    await expect(toggle).toHaveAttribute('aria-checked', 'true');
    await toggle.click();

    const fields = page.locator(SELECTORS.settings.passwordField);
    await expect(fields.first()).toBeVisible();
    await page
      .locator(SELECTORS.settings.passwordFieldCurrent)
      .fill(TEST_DATA.password.valid);
    await page.locator(SELECTORS.settings.passwordFormSubmit).click();

    await expect(toggle).toHaveAttribute('aria-checked', 'false');
    const settings = await getStorageData(page, 'settings');
    expect(settings?.password?.enabled).toBe(false);

    await page.close();
  });

  test('OPT-SET06: 長押しの秒数を変えると、ブロック解除にその秒数の長押しが要る', async ({
    context,
    extensionId
  }) => {
    const HOLD_SECONDS = 10;
    // 押し始めの記録と描画の遅れで、実測は設定値より少し短く出ることがある
    const MEASUREMENT_SLACK_MS = 1000;
    test.setTimeout(60 * 1000);

    const setupPage = await openOptions(context, extensionId);
    await setupTestStorage(setupPage, {
      withGoal: true,
      withBlockList: true,
      withAnalyticsOptIn: true
    });
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'settings');

    await expect(
      page.locator(SELECTORS.settings.unblockProtectionSection)
    ).toBeVisible();
    await page
      .locator(SELECTORS.settings.unblockHoldSecondsSelect)
      .selectOption(String(HOLD_SECONDS));

    await expect
      .poll(async () => {
        const settings = await getStorageData(page, 'settings');
        return settings?.unblockConfirm?.holdSeconds;
      })
      .toBe(HOLD_SECONDS);

    await page.locator(SELECTORS.options.blocklistTab).click();
    const toggle = page.locator(SELECTORS.options.itemToggle).first();
    await toggle.click();

    const modal = page.locator(SELECTORS.modal.unblockConfirm);
    await expect(modal).toBeVisible();
    await expect(modal).toContainText(`${HOLD_SECONDS} seconds`);

    const elapsedMs = await holdUnblockConfirm(page, HOLD_SECONDS);
    expect(elapsedMs).toBeGreaterThanOrEqual(
      HOLD_SECONDS * 1000 - MEASUREMENT_SLACK_MS
    );

    await expect(toggle).toHaveAttribute('aria-checked', 'false');

    await page.close();
  });

  test('OPT-SET07: 通知設定を変更できる', async ({ context, extensionId }) => {
    const setupPage = await openOptions(context, extensionId);
    await setStorageData(
      setupPage,
      'settings',
      makeAppSettings({
        notifications: { timeLimitEnabled: true, timeLimitMinutes: 5 }
      })
    );
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'settings');

    const heading = page.getByRole('heading', {
      name: UI_TEXT.notifications.heading
    });
    await expect(heading).toBeVisible();

    await heading.locator('xpath=following::select[1]').selectOption('10');
    await expect
      .poll(async () => {
        const settings = await getStorageData(page, 'settings');
        return settings?.notifications?.timeLimitMinutes;
      })
      .toBe(10);

    const toggle = toggleAfter(heading);
    await expect(toggle).toHaveAttribute('aria-checked', 'true');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', 'false');
    await expect(
      page.getByText(UI_TEXT.notifications.minutesLabel)
    ).toHaveCount(0);

    await expect
      .poll(async () => {
        const settings = await getStorageData(page, 'settings');
        return settings?.notifications?.timeLimitEnabled;
      })
      .toBe(false);

    await page.close();
  });

  test('OPT-SET08: Analytics Opt-In 設定を変更できる', async ({
    context,
    extensionId
  }) => {
    const page = await openOptions(context, extensionId, 'settings');

    const optInToggle = page.locator(SELECTORS.settings.analyticsOptInToggle);
    await expect(optInToggle).toBeVisible();

    const initialState = await optInToggle.getAttribute('aria-checked');

    await optInToggle.click();

    await expect(optInToggle).toHaveAttribute(
      'aria-checked',
      initialState === 'true' ? 'false' : 'true'
    );

    await page.close();
  });

  test('OPT-SET09: 設定データをエクスポートできる', async ({
    context,
    extensionId
  }) => {
    const setupPage = await openOptions(context, extensionId);
    await setStorageData(
      setupPage,
      'sites',
      makeSites([{ domain: 'reddit.com', block: {} }])
    );
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'settings');

    const exportButton = page.locator(SELECTORS.settings.exportSettingsButton);
    await expect(exportButton).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await exportButton.click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/vision.*\.json/i);

    const exported = JSON.parse(
      Buffer.concat(
        await (async () => {
          const chunks: Buffer[] = [];
          for await (const chunk of await download.createReadStream()) {
            chunks.push(chunk as Buffer);
          }
          return chunks;
        })()
      ).toString('utf8')
    ) as { version: number; data: { sites: Record<string, unknown> } };
    expect(exported.version).toBe(EXPORT_VERSION);
    expect(Object.keys(exported.data.sites)).toEqual(['reddit.com']);

    await page.close();
  });

  test('OPT-SET10: 設定データをインポートできる', async ({
    context,
    extensionId
  }) => {
    const settings = makeAppSettings();
    const vision = makeVision({
      defaultSettings: makeDisplaySettings({ goalText: 'Imported Goal' })
    });
    const testData = {
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      data: {
        sites: makeSites([{ domain: 'imported.example', block: {} }]),
        schedules: settings.schedules,
        presets: vision.presets,
        defaultDisplaySettings: vision.defaultSettings,
        activePresetId: vision.activePresetId,
        notifications: settings.notifications,
        unblockConfirm: settings.unblockConfirm
      }
    };

    const page = await openOptions(context, extensionId, 'settings');

    const importButton = page.locator(SELECTORS.settings.importSettingsButton);
    await expect(importButton).toBeVisible();

    const fileInput = page.locator('input[type="file"]');

    await fileInput.setInputFiles({
      name: 'test-settings.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(testData))
    });

    const resultMessage = page.locator(SELECTORS.settings.importResultMessage);
    await expect(resultMessage).toBeVisible();

    await expect(resultMessage).not.toContainText(/error|invalid|失敗|不正/i);

    await expect
      .poll(async () => {
        const sites = await getStorageData(page, 'sites');
        return sites?.['imported.example']?.block?.enabled ?? null;
      })
      .toBe(true);

    await page.close();
  });
});
