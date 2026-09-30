import type { Page } from '@playwright/test';

import { test, expect } from './fixtures/extension';

import { EXPORT_VERSION } from '~/lib/settingsExport';
import type { ExportedData } from '~/types/messageSchemas';
import type { AppSettings } from '~/types/storage';
import {
  openOptions,
  setupTestStorage,
  clearStorage,
  setStorageData,
  getStorageData,
  holdUnblockConfirm,
  makeAppSettings,
  makeDisplaySettings,
  makePreset,
  makeVision,
  setBackgroundImage,
  getBackgroundImageIds,
  TINY_JPEG_DATA_URL,
  toggleAfter,
  SELECTORS,
  TEST_DATA,
  UI_TEXT,
  makeSites,
  makeActivity,
  openExternalSite,
  setupStorageViaSW,
  getStorageViaSW,
  getAllStorageViaSW,
  TEST_DOMAINS
} from './helpers';

function exportFile(overrides: Partial<ExportedData> = {}) {
  const settings = makeAppSettings();
  return {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      sites: {},
      schedules: [],
      presets: [],
      defaultDisplaySettings: makeDisplaySettings(),
      activePresetId: null,
      notifications: settings.notifications,
      unblockConfirm: settings.unblockConfirm,
      ...overrides
    }
  };
}

async function chooseImportFile(page: Page, file: object): Promise<void> {
  await page.locator(SELECTORS.settings.importSettingsInput).setInputFiles({
    name: 'test-settings.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(file))
  });
}

const IMPORTED_SITE = 'imported.example';
const KEPT_SITE = 'kept.example';
const LOCAL_SITE = 'local.example';

function localOnlyStorage(overrides: Partial<AppSettings> = {}) {
  return {
    settings: makeAppSettings({
      schedules: [
        {
          id: 'local-schedule',
          name: 'Local',
          startTime: '09:00',
          endTime: '18:00',
          days: [1],
          enabled: true
        }
      ],
      ...overrides
    }),
    vision: makeVision({
      presets: [
        makePreset('local-style', 'Local Style', {
          customBackgroundId: 'local-img'
        })
      ],
      activePresetId: 'local-style'
    }),
    sites: makeSites([
      { domain: LOCAL_SITE, block: {} },
      { domain: KEPT_SITE }
    ]),
    activity: makeActivity([
      [LOCAL_SITE, { seconds: 120 }],
      [KEPT_SITE, { seconds: 60 }]
    ]),
    'backgroundImage:local-img': TINY_JPEG_DATA_URL
  };
}

function replacingFile() {
  const { customBackgroundId: _id, ...importedStyle } = makePreset(
    'imported-style',
    'Imported Style'
  );
  return exportFile({
    sites: makeSites([
      { domain: KEPT_SITE },
      { domain: IMPORTED_SITE, block: {} }
    ]),
    schedules: [
      {
        id: 'imported-schedule',
        name: 'Imported',
        startTime: '10:00',
        endTime: '11:00',
        days: [2],
        enabled: true
      }
    ],
    presets: [{ ...importedStyle, customBackgroundData: null }],
    activePresetId: 'imported-style'
  });
}

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
    await setStorageData(
      setupPage,
      'vision',
      makeVision({
        presets: [
          makePreset('default', 'Default', { customBackgroundId: 'img-1' })
        ]
      })
    );
    await setBackgroundImage(setupPage, 'img-1', TINY_JPEG_DATA_URL);
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
    ) as {
      version: number;
      data: {
        sites: Record<string, unknown>;
        presets: { id: string; customBackgroundData: string | null }[];
      };
    };
    expect(exported.version).toBe(EXPORT_VERSION);
    expect(Object.keys(exported.data.sites)).toEqual(['reddit.com']);
    expect(exported.data.presets).toEqual([
      expect.objectContaining({
        id: 'default',
        customBackgroundData: TINY_JPEG_DATA_URL
      })
    ]);
    expect(exported.data.presets[0]).not.toHaveProperty('customBackgroundId');

    await page.close();
  });

  test('OPT-SET10: 設定データをインポートでき、開いている設定タブに反映される', async ({
    context,
    extensionId
  }) => {
    const IMPORTED_HOLD_SECONDS = 10;
    const settings = makeAppSettings({
      unblockConfirm: { holdSeconds: IMPORTED_HOLD_SECONDS }
    });
    const vision = makeVision({
      defaultSettings: makeDisplaySettings({ goalText: 'Imported Goal' })
    });
    const { customBackgroundId: _id, ...importedStyle } = makePreset(
      'imported-style',
      'Imported Style'
    );
    const testData = {
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      data: {
        sites: makeSites([{ domain: 'imported.example', block: {} }]),
        schedules: settings.schedules,
        presets: [
          { ...importedStyle, customBackgroundData: TINY_JPEG_DATA_URL }
        ],
        defaultDisplaySettings: vision.defaultSettings,
        activePresetId: null,
        notifications: settings.notifications,
        unblockConfirm: settings.unblockConfirm
      }
    };

    const page = await openOptions(context, extensionId, 'settings');

    const importButton = page.locator(SELECTORS.settings.importSettingsButton);
    await expect(importButton).toBeVisible();

    await chooseImportFile(page, testData);
    await expect(
      page.locator(SELECTORS.settings.importConfirmMessage)
    ).toBeVisible();
    await page.locator(SELECTORS.settings.importConfirmSubmit).click();

    const resultMessage = page.locator(SELECTORS.settings.importResultMessage);
    await expect(resultMessage).toBeVisible();

    await expect(resultMessage).not.toContainText(/error|invalid|失敗|不正/i);

    await expect
      .poll(async () => {
        const sites = await getStorageData(page, 'sites');
        const rule = sites?.['imported.example']?.rule;
        return rule?.kind === 'block' ? rule.enabled : null;
      })
      .toBe(true);

    await expect(
      page.locator(SELECTORS.settings.unblockHoldSecondsSelect)
    ).toHaveValue(String(IMPORTED_HOLD_SECONDS));

    // 取り込んだスタイルは新しい ID で作った画像を指す
    const imported = (await getStorageData(page, 'vision'))?.presets.find(
      (p) => p.id === 'imported-style'
    );
    expect(imported?.customBackgroundId).toEqual(expect.any(String));
    expect(await getBackgroundImageIds(page)).toEqual([
      imported?.customBackgroundId
    ]);

    await page.close();
  });
  test('OPT-SET11: インポートでブロック対象になったサイトが、開いていたタブでも置き換わる', async ({
    context,
    extensionId
  }) => {
    await setupStorageViaSW(context, { settings: makeAppSettings() });

    const sitePage = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.reddit}`
    );
    expect(sitePage.url()).toContain(TEST_DOMAINS.reddit);
    expect(sitePage.url()).not.toContain('newtab.html');

    const page = await openOptions(context, extensionId, 'settings');
    await chooseImportFile(
      page,
      exportFile({
        sites: makeSites([{ domain: TEST_DOMAINS.reddit, block: {} }])
      })
    );
    await page.locator(SELECTORS.settings.importConfirmSubmit).click();

    await sitePage.waitForURL('**newtab.html**', { timeout: 10_000 });
    expect(sitePage.url()).toContain('newtab.html');

    await sitePage.close();
    await page.close();
  });

  test('OPT-SET12: 手元にしか無いサイト・スケジュール・スタイルが取り込みで消え、消えたサイトの記録も消える（ファイルにあるサイトの記録は残る）', async ({
    context,
    extensionId
  }) => {
    await setupStorageViaSW(context, localOnlyStorage());

    // 消えることを確かめる前に、在ることを確かめる
    expect(
      Object.keys((await getStorageViaSW(context, 'sites')) ?? {})
    ).toEqual(expect.arrayContaining([LOCAL_SITE, KEPT_SITE]));
    const activityBefore = Object.values(
      (await getStorageViaSW(context, 'activity')) ?? {}
    );
    expect(activityBefore.some((row) => LOCAL_SITE in row)).toBe(true);
    expect(activityBefore.some((row) => KEPT_SITE in row)).toBe(true);

    const page = await openOptions(context, extensionId, 'settings');
    expect(await getBackgroundImageIds(page)).toEqual(['local-img']);

    await chooseImportFile(page, replacingFile());
    await page.locator(SELECTORS.settings.importConfirmSubmit).click();
    await expect(
      page.locator(SELECTORS.settings.importConfirmMessage)
    ).toHaveCount(0);

    await expect
      .poll(async () =>
        Object.keys((await getStorageViaSW(context, 'sites')) ?? {}).sort()
      )
      .toEqual([IMPORTED_SITE, KEPT_SITE].sort());
    await expect
      .poll(async () => {
        const rows = Object.values(
          (await getStorageViaSW(context, 'activity')) ?? {}
        );
        return {
          local: rows.some((row) => LOCAL_SITE in row),
          kept: rows.some((row) => KEPT_SITE in row)
        };
      })
      .toEqual({ local: false, kept: true });

    const settings = await getStorageViaSW(context, 'settings');
    expect(settings?.schedules.map((schedule) => schedule.id)).toEqual([
      'imported-schedule'
    ]);
    const vision = await getStorageViaSW(context, 'vision');
    expect(vision?.presets.map((preset) => preset.id)).toEqual([
      'imported-style'
    ]);
    expect(vision?.activePresetId).toBe('imported-style');
    expect(await getBackgroundImageIds(page)).toEqual([]);

    await page.close();
  });

  test('OPT-SET13: 取り込みの確認をキャンセルすると何も変わらない', async ({
    context,
    extensionId
  }) => {
    await setupStorageViaSW(context, localOnlyStorage());

    const page = await openOptions(context, extensionId, 'settings');
    await chooseImportFile(page, replacingFile());
    await expect(
      page.locator(SELECTORS.settings.importConfirmMessage)
    ).toBeVisible();
    const before = await getAllStorageViaSW(context);

    await page.locator(SELECTORS.settings.importConfirmCancel).click();

    await expect(
      page.locator(SELECTORS.settings.importConfirmMessage)
    ).toHaveCount(0);
    await expect(
      page.locator(SELECTORS.settings.importResultMessage)
    ).toHaveCount(0);
    expect(await getAllStorageViaSW(context)).toEqual(before);

    await page.close();
  });

  test('OPT-SET14: パスワード保護中は確認でパスワードを求め、違うと理由が出て何も変わらず、合うと取り込まれる', async ({
    context,
    extensionId
  }) => {
    await setupStorageViaSW(
      context,
      localOnlyStorage({
        password: { enabled: true, passwordHash: TEST_DATA.password.validHash }
      })
    );

    const page = await openOptions(context, extensionId, 'settings');
    await chooseImportFile(page, replacingFile());

    const passwordField = page.locator(SELECTORS.settings.importPasswordField);
    const submit = page.locator(SELECTORS.settings.importConfirmSubmit);
    await expect(passwordField).toBeVisible();
    await expect(submit).toBeDisabled();
    const before = await getAllStorageViaSW(context);

    await passwordField.fill(TEST_DATA.password.invalid);
    await submit.click();

    await expect(
      page.locator(SELECTORS.settings.importConfirmError)
    ).toBeVisible();
    await expect(
      page.locator(SELECTORS.settings.importConfirmMessage)
    ).toBeVisible();
    expect(await getAllStorageViaSW(context)).toEqual(before);

    await passwordField.fill(TEST_DATA.password.valid);
    await submit.click();

    await expect(
      page.locator(SELECTORS.settings.importConfirmMessage)
    ).toHaveCount(0);
    await expect
      .poll(async () =>
        Object.keys((await getStorageViaSW(context, 'sites')) ?? {}).sort()
      )
      .toEqual([IMPORTED_SITE, KEPT_SITE].sort());
    expect((await getStorageViaSW(context, 'settings'))?.password).toEqual({
      enabled: true,
      passwordHash: TEST_DATA.password.validHash
    });

    await page.close();
  });
});
