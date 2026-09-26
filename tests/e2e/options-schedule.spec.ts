import { test, expect } from './fixtures/extension';
import {
  openOptions,
  openNewTab,
  setupTestStorage,
  clearStorage,
  setStorageData,
  makeDisplaySettings,
  makeVision,
  makePreset,
  makeAppSettings,
  getStorageData,
  SELECTORS,
  UI_TEXT
} from './helpers';

test.describe('Options - Schedule Tab', () => {
  test.beforeEach(async ({ context, extensionId }) => {
    const page = await openOptions(context, extensionId);
    await clearStorage(page);
    await setupTestStorage(page, {
      withGoal: true,
      withAnalyticsOptIn: true,
      withSchedule: true
    });
    await page.close();
  });

  test('OPT-S01: スケジュールタブが表示される', async ({
    context,
    extensionId
  }) => {
    const page = await openOptions(context, extensionId, 'schedules');

    await expect(page.locator(SELECTORS.options.schedulesTab)).toBeVisible();

    await expect(
      page.locator(SELECTORS.schedules.weeklyCalendar)
    ).toBeVisible();

    await expect(
      page.locator(SELECTORS.schedules.addScheduleButton)
    ).toBeVisible();

    await page.close();
  });

  test('OPT-S02: 週間カレンダーが表示される', async ({
    context,
    extensionId
  }) => {
    const page = await openOptions(context, extensionId, 'schedules');

    const calendar = page.locator(SELECTORS.schedules.weeklyCalendar);
    await expect(calendar).toBeVisible();

    await expect(
      page.locator(SELECTORS.schedules.weeklyCalendarDayHeader)
    ).toHaveCount(7);

    await page.close();
  });

  test('OPT-S03: スケジュールを追加できる', async ({
    context,
    extensionId
  }) => {
    const page = await openOptions(context, extensionId, 'schedules');

    await page.locator(SELECTORS.schedules.addScheduleButton).click();

    const modal = page.locator(SELECTORS.schedules.scheduleModal);
    await expect(modal).toBeVisible();

    const nameInput = modal.locator(SELECTORS.schedules.scheduleNameInput);
    await nameInput.fill('Morning Focus');

    const startTime = modal.locator(SELECTORS.schedules.startTimeInput);
    await startTime.fill('19:00');

    const endTime = modal.locator(SELECTORS.schedules.endTimeInput);
    await endTime.fill('21:00');

    const dayCheckboxes = modal.locator(SELECTORS.schedules.dayCheckbox);
    await dayCheckboxes.nth(1).click();

    await modal.locator(SELECTORS.schedules.saveScheduleButton).click();

    await expect(modal).not.toBeVisible();

    const scheduleItem = page.locator(SELECTORS.schedules.scheduleItem);
    await expect(
      scheduleItem.filter({ hasText: 'Morning Focus' })
    ).toBeVisible();

    await page.close();
  });

  test('OPT-S04: 時間帯（開始・終了）を設定できる', async ({
    context,
    extensionId
  }) => {
    const page = await openOptions(context, extensionId, 'schedules');

    await page.locator(SELECTORS.schedules.addScheduleButton).click();

    const modal = page.locator(SELECTORS.schedules.scheduleModal);

    const startTime = modal.locator(SELECTORS.schedules.startTimeInput);
    await startTime.fill('14:00');
    await expect(startTime).toHaveValue('14:00');

    const endTime = modal.locator(SELECTORS.schedules.endTimeInput);
    await endTime.fill('18:00');
    await expect(endTime).toHaveValue('18:00');

    await page.locator(SELECTORS.schedules.cancelScheduleButton).click();

    await page.close();
  });

  test('OPT-S05: 曜日を選択できる', async ({ context, extensionId }) => {
    const page = await openOptions(context, extensionId, 'schedules');

    await page.locator(SELECTORS.schedules.addScheduleButton).click();

    const modal = page.locator(SELECTORS.schedules.scheduleModal);

    // count() は自動リトライしないため toHaveCount で待つ
    const dayCheckboxes = modal.locator(SELECTORS.schedules.dayCheckbox);
    await expect(dayCheckboxes).toHaveCount(7);

    for (const index of [1, 3]) {
      const day = dayCheckboxes.nth(index);
      const before = await day.getAttribute('aria-pressed');
      await day.click();
      await expect(day).toHaveAttribute(
        'aria-pressed',
        before === 'true' ? 'false' : 'true'
      );
    }

    await page.locator(SELECTORS.schedules.cancelScheduleButton).click();

    await page.close();
  });

  test('OPT-S06: プリセットをスケジュールに連携できる', async ({
    context,
    extensionId
  }) => {
    const page = await openOptions(context, extensionId, 'schedules');

    await page.locator(SELECTORS.schedules.addScheduleButton).click();

    const modal = page.locator(SELECTORS.schedules.scheduleModal);

    const presetSelect = modal.locator(SELECTORS.schedules.presetSelect);
    await expect(presetSelect).toBeVisible();

    await presetSelect.selectOption({ index: 0 });

    await page.locator(SELECTORS.schedules.cancelScheduleButton).click();

    await page.close();
  });

  test('OPT-S07: スケジュールを編集できる', async ({
    context,
    extensionId
  }) => {
    const setupPage = await openOptions(context, extensionId);
    await setStorageData(
      setupPage,
      'settings',
      makeAppSettings({
        schedules: [
          {
            id: 'schedule1',
            name: 'Test Schedule',
            startTime: '09:00',
            endTime: '12:00',
            days: [1, 3, 5],
            presetId: 'default',
            enabled: true
          }
        ]
      })
    );
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'schedules');

    const scheduleItem = page
      .locator(SELECTORS.schedules.scheduleItem)
      .filter({ hasText: 'Test Schedule' });
    await expect(scheduleItem).toBeVisible();

    const editButton = scheduleItem.locator(SELECTORS.schedules.editButton);
    await editButton.click();

    const modal = page.locator(SELECTORS.schedules.scheduleModal);
    await expect(modal).toBeVisible();

    const nameInput = modal.locator(SELECTORS.schedules.scheduleNameInput);
    await expect(nameInput).toHaveValue('Test Schedule');

    await nameInput.fill('Updated Schedule');

    await modal.locator(SELECTORS.schedules.saveScheduleButton).click();

    await expect(modal).not.toBeVisible();

    await expect(
      page
        .locator(SELECTORS.schedules.scheduleItem)
        .filter({ hasText: 'Updated Schedule' })
    ).toBeVisible();

    await page.close();
  });

  test('OPT-S08: スケジュールを削除できる', async ({
    context,
    extensionId
  }) => {
    const setupPage = await openOptions(context, extensionId);
    await setStorageData(
      setupPage,
      'settings',
      makeAppSettings({
        schedules: [
          {
            id: 'schedule1',
            name: 'Delete Me',
            startTime: '09:00',
            endTime: '12:00',
            days: [1],
            presetId: 'default',
            enabled: true
          }
        ]
      })
    );
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'schedules');

    const scheduleItem = page
      .locator(SELECTORS.schedules.scheduleItem)
      .filter({ hasText: 'Delete Me' });
    await expect(scheduleItem).toBeVisible();

    const deleteButton = scheduleItem.locator(SELECTORS.schedules.deleteButton);
    await deleteButton.click();

    await expect(scheduleItem).not.toBeVisible();

    await page.close();
  });

  test('OPT-S09: スケジュールを有効/無効切り替えできる', async ({
    context,
    extensionId
  }) => {
    const setupPage = await openOptions(context, extensionId);
    await setStorageData(
      setupPage,
      'settings',
      makeAppSettings({
        schedules: [
          {
            id: 'schedule1',
            name: 'Toggle Schedule',
            startTime: '09:00',
            endTime: '12:00',
            days: [1],
            presetId: 'default',
            enabled: true
          }
        ]
      })
    );
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'schedules');

    const scheduleItem = page
      .locator(SELECTORS.schedules.scheduleItem)
      .filter({ hasText: 'Toggle Schedule' });
    await expect(scheduleItem).toBeVisible();

    const toggle = scheduleItem.locator(SELECTORS.schedules.scheduleToggle);
    await expect(toggle).toBeVisible();

    await expect(toggle).toHaveAttribute('aria-checked', 'true');

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', 'false');

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', 'true');

    await page.close();
  });

  test('OPT-S10: 設定した時間帯に該当プリセットが自動適用される', async ({
    context,
    extensionId
  }) => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay();
    const startTime = `${String(currentHour).padStart(2, '0')}:00`;
    const endTime =
      currentHour === 23
        ? '00:00'
        : `${String(currentHour + 1).padStart(2, '0')}:00`;

    const setupPage = await openOptions(context, extensionId);
    await setStorageData(
      setupPage,
      'vision',
      makeVision({
        presets: [
          makePreset('default', 'Default', { goalText: 'Default Goal' }),
          makePreset('work', 'Work', { goalText: 'Work Mode Goal' })
        ],
        activePresetId: 'default'
      })
    );
    await setStorageData(
      setupPage,
      'settings',
      makeAppSettings({
        schedules: [
          {
            id: 'schedule1',
            name: 'Auto Apply',
            startTime,
            endTime,
            days: [currentDay],
            presetId: 'work',
            enabled: true
          }
        ]
      })
    );
    await setupPage.close();

    const activePage = await openNewTab(context, extensionId);
    await expect(activePage.locator(SELECTORS.newtab.goalText)).toContainText(
      'Work Mode Goal'
    );
    await activePage.close();

    const disablePage = await openOptions(context, extensionId);
    await setStorageData(
      disablePage,
      'settings',
      makeAppSettings({
        schedules: [
          {
            id: 'schedule1',
            name: 'Auto Apply',
            startTime,
            endTime,
            days: [currentDay],
            presetId: 'work',
            enabled: false
          }
        ]
      })
    );
    await disablePage.close();

    const inactivePage = await openNewTab(context, extensionId);
    await expect(inactivePage.locator(SELECTORS.newtab.goalText)).toContainText(
      'Default Goal'
    );
    await inactivePage.close();
  });

  test('OPT-S11: 無効なスケジュールは半透明・取り消し線で表示される', async ({
    context,
    extensionId
  }) => {
    const setupPage = await openOptions(context, extensionId);
    await setStorageData(
      setupPage,
      'settings',
      makeAppSettings({
        schedules: [
          {
            id: 'schedule1',
            name: 'Disabled Schedule',
            startTime: '09:00',
            endTime: '12:00',
            days: [1],
            presetId: 'default',
            enabled: false
          }
        ]
      })
    );
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'schedules');

    const scheduleItem = page
      .locator(SELECTORS.schedules.scheduleItem)
      .filter({ hasText: 'Disabled Schedule' });
    await expect(scheduleItem).toBeVisible();

    const toggle = scheduleItem.locator(SELECTORS.schedules.scheduleToggle);
    await expect(toggle).toHaveAttribute('aria-checked', 'false');

    await page.close();
  });

  test('OPT-S12: 全てのスタイルがスケジュールで選択できる', async ({
    context,
    extensionId
  }) => {
    const setupPage = await openOptions(context, extensionId);
    await setStorageData(setupPage, 'vision', {
      defaultSettings: makeDisplaySettings({ goalText: 'Focus' }),
      presets: [
        makePreset('default', 'Default', { goalText: 'Default Goal' }),
        makePreset('second', 'Second', { goalText: 'Second Goal' }),
        makePreset('third', 'Third', { goalText: 'Third Goal' })
      ],
      activePresetId: 'default'
    });
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'schedules');

    await page.locator(SELECTORS.schedules.addScheduleButton).click();

    const modal = page.locator(SELECTORS.schedules.scheduleModal);
    const presetSelect = modal.locator(SELECTORS.schedules.presetSelect);
    const options = presetSelect.locator('option');

    for (const name of ['Default', 'Second', 'Third']) {
      const option = options.filter({ hasText: name });
      await expect(option).toHaveCount(1);
      await expect(option).not.toBeDisabled();
    }

    await page.locator(SELECTORS.schedules.cancelScheduleButton).click();

    await page.close();
  });

  test('OPT-S13: 重複スケジュール（同時刻・同曜日）が設定された場合にエラー表示', async ({
    context,
    extensionId
  }) => {
    const setupPage = await openOptions(context, extensionId);
    await setStorageData(
      setupPage,
      'settings',
      makeAppSettings({
        schedules: [
          {
            id: 'schedule1',
            name: 'Existing Schedule',
            startTime: '09:00',
            endTime: '12:00',
            days: [1],
            presetId: 'default',
            enabled: true
          }
        ]
      })
    );
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'schedules');

    await page.locator(SELECTORS.schedules.addScheduleButton).click();

    const modal = page.locator(SELECTORS.schedules.scheduleModal);

    const nameInput = modal.locator(SELECTORS.schedules.scheduleNameInput);
    await nameInput.fill('Duplicate Schedule');

    const startTime = modal.locator(SELECTORS.schedules.startTimeInput);
    await startTime.fill('10:00');
    const endTime = modal.locator(SELECTORS.schedules.endTimeInput);
    await endTime.fill('13:00');

    const dayButtons = modal.locator(SELECTORS.schedules.dayCheckbox);
    for (const day of [2, 3, 4, 5]) {
      await dayButtons.nth(day).click();
    }
    await expect(dayButtons.nth(1)).toHaveAttribute('aria-pressed', 'true');

    const saveButton = modal.locator(SELECTORS.schedules.saveScheduleButton);
    await saveButton.click();

    const error = modal.locator(SELECTORS.schedules.scheduleError);
    await expect(error).toBeVisible();
    await expect(error).toHaveText(UI_TEXT.schedules.overlapError);
    await expect(modal).toBeVisible();

    const settings = await getStorageData(page, 'settings');
    expect(settings?.schedules).toHaveLength(1);
    expect(settings?.schedules[0].id).toBe('schedule1');

    await page.close();
  });

  test('OPT-S14: プリセット削除時、該当スケジュールのスタイル連携が解除される', async ({
    context,
    extensionId
  }) => {
    const setupPage = await openOptions(context, extensionId);
    await setStorageData(setupPage, 'vision', {
      defaultSettings: makeDisplaySettings({ goalText: 'Focus' }),
      presets: [
        makePreset('default', 'Default', { goalText: 'Default Goal' }),
        makePreset('to-delete', 'To Delete', { goalText: 'To Delete Goal' })
      ],
      activePresetId: 'default'
    });
    await setStorageData(
      setupPage,
      'settings',
      makeAppSettings({
        schedules: [
          {
            id: 'schedule1',
            name: 'Linked Schedule',
            startTime: '09:00',
            endTime: '12:00',
            days: [1],
            presetId: 'to-delete',
            enabled: true
          }
        ]
      })
    );
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'styles');

    const presetButton = page
      .locator(SELECTORS.styles.presetButton)
      .filter({ hasText: 'To Delete' });
    await presetButton.click();

    const deleteButton = page.locator(SELECTORS.styles.deleteButton);
    await deleteButton.click();

    const confirmModal = page.locator(SELECTORS.styles.deletePresetModal);
    await expect(confirmModal).toBeVisible();
    await expect(
      page.locator(SELECTORS.styles.deletePresetScheduleCount)
    ).toContainText('1');

    await page.locator(SELECTORS.styles.deletePresetCancel).click();
    await expect(confirmModal).toBeHidden();
    await expect(presetButton).toBeVisible();

    await deleteButton.click();
    await page.locator(SELECTORS.styles.deletePresetConfirm).click();
    await expect(confirmModal).toBeHidden();
    await expect(presetButton).toHaveCount(0);

    await page.locator(SELECTORS.options.schedulesTab).click();

    const scheduleItem = page
      .locator(SELECTORS.schedules.scheduleItem)
      .filter({ hasText: 'Linked Schedule' });

    await expect(scheduleItem).toBeVisible();

    const toggle = scheduleItem.locator(SELECTORS.schedules.scheduleToggle);
    await expect(toggle).toHaveAttribute('aria-checked', 'true');

    await expect(
      scheduleItem.locator(SELECTORS.schedules.scheduleItemPreset)
    ).toHaveCount(0);

    await page.close();
  });
});
