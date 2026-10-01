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
  getRuleDomains,
  getStorageViaSW,
  makeSites,
  openExternalSite,
  setupStorageViaSW,
  waitForNoBlockRules,
  SELECTORS,
  TEST_DOMAINS,
  UI_TEXT
} from './helpers';

import type { Schedule } from '~/types/storage';

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const HOURS_PER_DAY = 24;

function hourLabel(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

// 全曜日・時単位で作り、境界から 1 時間以上離す（実行中に時・日付・曜日が変わっても今の時刻との関係が変わらない）
function hourWindow(
  startHoursFromNow: number,
  hours: number
): Pick<Schedule, 'startTime' | 'endTime' | 'days'> {
  const currentHour = new Date().getHours();
  const start =
    (currentHour + startHoursFromNow + HOURS_PER_DAY) % HOURS_PER_DAY;
  const end = (start + hours) % HOURS_PER_DAY;
  return {
    startTime: hourLabel(start),
    endTime: end === 0 ? '24:00' : hourLabel(end),
    days: ALL_DAYS
  };
}

// 有効なスケジュールが 1 件も無いと常にブロックするため、今の時刻を含まない有効なスケジュールを置いてブロックを止めておく
function laterSchedule(): Schedule {
  return {
    id: 'later',
    name: 'Later Window',
    ...hourWindow(6, 1),
    enabled: true
  };
}

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
    expect(settings?.schedules[0]).toMatchObject({ id: 'schedule1' });

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

  test('OPT-S15: 曜日を選ばないとスケジュールを保存できない', async ({
    context,
    extensionId
  }) => {
    const page = await openOptions(context, extensionId, 'schedules');

    await page.locator(SELECTORS.schedules.addScheduleButton).click();

    const modal = page.locator(SELECTORS.schedules.scheduleModal);
    await modal
      .locator(SELECTORS.schedules.scheduleNameInput)
      .fill('No Days Schedule');

    const saveButton = modal.locator(SELECTORS.schedules.saveScheduleButton);
    await expect(saveButton).toBeEnabled();

    const dayButtons = modal.locator(SELECTORS.schedules.dayCheckbox);
    await expect(dayButtons).toHaveCount(7);
    for (let day = 0; day < 7; day++) {
      const button = dayButtons.nth(day);
      if ((await button.getAttribute('aria-pressed')) === 'true') {
        await button.click();
        await expect(button).toHaveAttribute('aria-pressed', 'false');
      }
    }

    await expect(saveButton).toBeDisabled();

    await dayButtons.nth(0).click();
    await expect(saveButton).toBeEnabled();

    await page.locator(SELECTORS.schedules.cancelScheduleButton).click();

    await page.close();
  });

  test('OPT-S16: 無効のスケジュールを編集して保存しても無効のまま', async ({
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
    await expect(
      scheduleItem.locator(SELECTORS.schedules.scheduleToggle)
    ).toHaveAttribute('aria-checked', 'false');

    await scheduleItem.locator(SELECTORS.schedules.editButton).click();

    const modal = page.locator(SELECTORS.schedules.scheduleModal);
    await expect(modal).toBeVisible();
    await modal
      .locator(SELECTORS.schedules.scheduleNameInput)
      .fill('Renamed Schedule');
    await modal.locator(SELECTORS.schedules.saveScheduleButton).click();
    await expect(modal).not.toBeVisible();

    const renamedItem = page
      .locator(SELECTORS.schedules.scheduleItem)
      .filter({ hasText: 'Renamed Schedule' });
    await expect(renamedItem).toBeVisible();
    await expect(
      renamedItem.locator(SELECTORS.schedules.scheduleToggle)
    ).toHaveAttribute('aria-checked', 'false');

    const settings = await getStorageData(page, 'settings');
    expect(settings?.schedules).toHaveLength(1);
    expect(settings?.schedules[0]).toMatchObject({
      id: 'schedule1',
      name: 'Renamed Schedule',
      enabled: false
    });

    await page.close();
  });
  test('OPT-S17: 今の時刻を含むスケジュールを有効にすると、開いているブロック対象のタブがブロック画面へ移る', async ({
    context,
    extensionId
  }) => {
    await setupStorageViaSW(context, {
      settings: makeAppSettings({
        schedules: [
          laterSchedule(),
          {
            id: 'current',
            name: 'Current Window',
            ...hourWindow(-1, 3),
            enabled: false
          }
        ]
      }),
      sites: makeSites([{ domain: TEST_DOMAINS.reddit, block: {} }])
    });
    await waitForNoBlockRules(context, [TEST_DOMAINS.reddit]);

    const sitePage = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.reddit}`
    );
    expect(sitePage.url()).toContain(TEST_DOMAINS.reddit);
    expect(sitePage.url()).not.toContain('newtab.html');

    const page = await openOptions(context, extensionId, 'schedules');
    const toggle = page
      .locator(SELECTORS.schedules.scheduleItem)
      .filter({ hasText: 'Current Window' })
      .locator(SELECTORS.schedules.scheduleToggle);
    await expect(toggle).toHaveAttribute('aria-checked', 'false');
    await toggle.click();

    await sitePage.waitForURL('**newtab.html**', { timeout: 10_000 });
    expect(sitePage.url()).toContain('newtab.html');

    await sitePage.close();
    await page.close();
  });

  test('OPT-S18: 有効にしたスケジュールが今の時刻を含まなければ、開いているタブは移らない', async ({
    context,
    extensionId
  }) => {
    await setupStorageViaSW(context, {
      settings: makeAppSettings({
        schedules: [
          laterSchedule(),
          {
            id: 'night',
            name: 'Night Window',
            ...hourWindow(12, 1),
            enabled: false
          }
        ]
      }),
      sites: makeSites([{ domain: TEST_DOMAINS.reddit, block: {} }])
    });
    await waitForNoBlockRules(context, [TEST_DOMAINS.reddit]);

    const sitePage = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.reddit}`
    );

    const page = await openOptions(context, extensionId, 'schedules');
    const toggle = page
      .locator(SELECTORS.schedules.scheduleItem)
      .filter({ hasText: 'Night Window' })
      .locator(SELECTORS.schedules.scheduleToggle);
    await expect(toggle).toHaveAttribute('aria-checked', 'false');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', 'true');

    await expect
      .poll(
        async () =>
          (await getStorageViaSW(context, 'settings'))?.schedules.find(
            (schedule) => schedule.id === 'night'
          )?.enabled
      )
      .toBe(true);
    expect((await getRuleDomains(context)).redirect).not.toContain(
      TEST_DOMAINS.reddit
    );
    expect(sitePage.url()).toContain(TEST_DOMAINS.reddit);
    expect(sitePage.url()).not.toContain('newtab.html');

    await sitePage.close();
    await page.close();
  });
});
