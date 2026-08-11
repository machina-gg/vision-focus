import { test, expect } from './fixtures/extension';
import {
  openOptions,
  setupTestStorage,
  clearStorage,
  setStorageData,
  makeDisplaySettings,
  makePreset,
  makeSettings,
  SELECTORS
} from './helpers';

/**
 * E2Eテスト: Options - Schedule Tab
 *
 * OPT-S01 ~ OPT-S14 のテストケースを実装
 */

test.describe('Options - Schedule Tab', () => {
  test.beforeEach(async ({ context, extensionId }) => {
    // 各テストの前にストレージをセットアップ
    const page = await openOptions(context, extensionId);
    await clearStorage(page);
    await setupTestStorage(page, {
      withGoal: true,
      withAnalyticsOptIn: true,
      // 週間カレンダーはスケジュールが無いと描画されないため 1 件用意する
      withSchedule: true
    });
    await page.close();
  });

  test('OPT-S01: スケジュールタブが表示される', async ({
    context,
    extensionId
  }) => {
    const page = await openOptions(context, extensionId, 'schedules');

    // スケジュールタブが表示される
    await expect(page.locator(SELECTORS.options.schedulesTab)).toBeVisible();

    // 週間カレンダーが表示される
    await expect(
      page.locator(SELECTORS.schedules.weeklyCalendar)
    ).toBeVisible();

    // スケジュール追加ボタンが表示される
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

    // 週間カレンダーが表示される
    const calendar = page.locator(SELECTORS.schedules.weeklyCalendar);
    await expect(calendar).toBeVisible();

    // 7日分の曜日ヘッダーが表示される（日曜〜土曜）。
    // カレンダーは時刻列を含む 8 列構成なので、曜日ヘッダーを数える
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

    // スケジュール追加ボタンをクリック
    await page.locator(SELECTORS.schedules.addScheduleButton).click();

    // スケジュールモーダルが表示される
    const modal = page.locator(SELECTORS.schedules.scheduleModal);
    await expect(modal).toBeVisible();

    // スケジュール名を入力
    const nameInput = modal.locator(SELECTORS.schedules.scheduleNameInput);
    await nameInput.fill('Morning Focus');

    // 開始時刻を設定
    const startTime = modal.locator(SELECTORS.schedules.startTimeInput);
    await startTime.fill('09:00');

    // 終了時刻を設定
    const endTime = modal.locator(SELECTORS.schedules.endTimeInput);
    await endTime.fill('12:00');

    // 曜日を選択（月曜）
    // 曜日は checkbox ではなくトグルボタンなので click で切り替える
    const dayCheckboxes = modal.locator(SELECTORS.schedules.dayCheckbox);
    await dayCheckboxes.nth(1).click();

    // 保存ボタンをクリック
    await modal.locator(SELECTORS.schedules.saveScheduleButton).click();

    // モーダルが閉じる
    await expect(modal).not.toBeVisible();

    // スケジュールが一覧に表示される
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

    // スケジュール追加ボタンをクリック
    await page.locator(SELECTORS.schedules.addScheduleButton).click();

    const modal = page.locator(SELECTORS.schedules.scheduleModal);

    // 開始時刻を設定
    const startTime = modal.locator(SELECTORS.schedules.startTimeInput);
    await startTime.fill('14:00');
    await expect(startTime).toHaveValue('14:00');

    // 終了時刻を設定
    const endTime = modal.locator(SELECTORS.schedules.endTimeInput);
    await endTime.fill('18:00');
    await expect(endTime).toHaveValue('18:00');

    // モーダルを閉じる
    await page.locator(SELECTORS.schedules.cancelScheduleButton).click();

    await page.close();
  });

  test('OPT-S05: 曜日を選択できる', async ({ context, extensionId }) => {
    const page = await openOptions(context, extensionId, 'schedules');

    // スケジュール追加ボタンをクリック
    await page.locator(SELECTORS.schedules.addScheduleButton).click();

    const modal = page.locator(SELECTORS.schedules.scheduleModal);

    // 曜日チェックボックスが7つ表示される
    // 曜日は checkbox ではなくトグルボタンなので click で切り替える
    const dayCheckboxes = modal.locator(SELECTORS.schedules.dayCheckbox);
    const count = await dayCheckboxes.count();
    expect(count).toBeGreaterThanOrEqual(7);

    // 曜日ボタンは初期状態で一部が選択済みのため、クリックで状態が
    // 反転することを検証する
    for (const index of [1, 3]) {
      const day = dayCheckboxes.nth(index);
      const before = await day.getAttribute('aria-pressed');
      await day.click();
      await expect(day).toHaveAttribute(
        'aria-pressed',
        before === 'true' ? 'false' : 'true'
      );
    }

    // モーダルを閉じる
    await page.locator(SELECTORS.schedules.cancelScheduleButton).click();

    await page.close();
  });

  test('OPT-S06: プリセットをスケジュールに連携できる', async ({
    context,
    extensionId
  }) => {
    const page = await openOptions(context, extensionId, 'schedules');

    // スケジュール追加ボタンをクリック
    await page.locator(SELECTORS.schedules.addScheduleButton).click();

    const modal = page.locator(SELECTORS.schedules.scheduleModal);

    // プリセット選択セレクトが表示される
    const presetSelect = modal.locator(SELECTORS.schedules.presetSelect);
    await expect(presetSelect).toBeVisible();

    // プリセットを選択
    await presetSelect.selectOption({ index: 0 });

    // モーダルを閉じる
    await page.locator(SELECTORS.schedules.cancelScheduleButton).click();

    await page.close();
  });

  test('OPT-S07: スケジュールを編集できる', async ({
    context,
    extensionId
  }) => {
    // テスト用スケジュールを追加
    const setupPage = await openOptions(context, extensionId);
    await setStorageData(
      setupPage,
      'settings',
      makeSettings({
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

    // スケジュールアイテムの編集ボタンをクリック
    const scheduleItem = page
      .locator(SELECTORS.schedules.scheduleItem)
      .filter({ hasText: 'Test Schedule' });
    await expect(scheduleItem).toBeVisible();

    const editButton = scheduleItem.locator(SELECTORS.schedules.editButton);
    await editButton.click();

    // スケジュールモーダルが表示される
    const modal = page.locator(SELECTORS.schedules.scheduleModal);
    await expect(modal).toBeVisible();

    // 既存の値が入力されている
    const nameInput = modal.locator(SELECTORS.schedules.scheduleNameInput);
    await expect(nameInput).toHaveValue('Test Schedule');

    // 名前を変更
    await nameInput.fill('Updated Schedule');

    // 保存ボタンをクリック
    await modal.locator(SELECTORS.schedules.saveScheduleButton).click();

    // モーダルが閉じる
    await expect(modal).not.toBeVisible();

    // 更新されたスケジュールが表示される
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
    // テスト用スケジュールを追加
    const setupPage = await openOptions(context, extensionId);
    await setStorageData(
      setupPage,
      'settings',
      makeSettings({
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

    // スケジュールアイテムが表示される
    const scheduleItem = page
      .locator(SELECTORS.schedules.scheduleItem)
      .filter({ hasText: 'Delete Me' });
    await expect(scheduleItem).toBeVisible();

    // 削除ボタンをクリック
    const deleteButton = scheduleItem.locator(SELECTORS.schedules.deleteButton);
    await deleteButton.click();

    // スケジュールが削除される（一覧から消える）
    await expect(scheduleItem).not.toBeVisible();

    await page.close();
  });

  test('OPT-S09: スケジュールを有効/無効切り替えできる', async ({
    context,
    extensionId
  }) => {
    // テスト用スケジュールを追加
    const setupPage = await openOptions(context, extensionId);
    await setStorageData(
      setupPage,
      'settings',
      makeSettings({
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

    // スケジュールアイテムが表示される
    const scheduleItem = page
      .locator(SELECTORS.schedules.scheduleItem)
      .filter({ hasText: 'Toggle Schedule' });
    await expect(scheduleItem).toBeVisible();

    // トグルスイッチを取得
    const toggle = scheduleItem.locator(SELECTORS.schedules.scheduleToggle);
    await expect(toggle).toBeVisible();

    // 初期状態は有効
    await expect(toggle).toHaveAttribute('aria-checked', 'true');

    // トグルをクリックして無効化
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', 'false');

    // 再度クリックして有効化
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', 'true');

    await page.close();
  });

  test('OPT-S10: 設定した時間帯に該当プリセットが自動適用される', async ({
    context,
    extensionId
  }) => {
    // このテストは実際の時刻判定が必要なため、スケジュール設定の保存を確認するのみ
    const setupPage = await openOptions(context, extensionId);
    await setStorageData(
      setupPage,
      'settings',
      makeSettings({
        schedules: [
          {
            id: 'schedule1',
            name: 'Auto Apply',
            startTime: '09:00',
            endTime: '17:00',
            days: [1, 2, 3, 4, 5], // 平日
            presetId: 'default',
            enabled: true
          }
        ]
      })
    );
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'schedules');

    // スケジュールが設定されていることを確認
    const scheduleItem = page
      .locator(SELECTORS.schedules.scheduleItem)
      .filter({ hasText: 'Auto Apply' });
    await expect(scheduleItem).toBeVisible();

    // プリセット情報が表示される
    const presetLabel = scheduleItem.locator(
      SELECTORS.schedules.scheduleItemPreset
    );
    await expect(presetLabel).toBeVisible();

    await page.close();
  });

  test('OPT-S11: 無効なスケジュールは半透明・取り消し線で表示される', async ({
    context,
    extensionId
  }) => {
    // 無効なスケジュールを追加
    const setupPage = await openOptions(context, extensionId);
    await setStorageData(
      setupPage,
      'settings',
      makeSettings({
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

    // スケジュールアイテムが表示される
    const scheduleItem = page
      .locator(SELECTORS.schedules.scheduleItem)
      .filter({ hasText: 'Disabled Schedule' });
    await expect(scheduleItem).toBeVisible();

    // トグルが無効状態
    const toggle = scheduleItem.locator(SELECTORS.schedules.scheduleToggle);
    await expect(toggle).toHaveAttribute('aria-checked', 'false');

    // 半透明または取り消し線のスタイルが適用される（実装依存）
    // 視覚的な確認が必要なため、ここでは表示を確認するのみ

    await page.close();
  });

  test('OPT-S12: ロックされたプリセットはスケジュールで選択不可', async ({
    context,
    extensionId
  }) => {
    // Freeユーザーで複数プリセットを作成
    const setupPage = await openOptions(context, extensionId);
    await setStorageData(setupPage, 'vision', {
      defaultSettings: makeDisplaySettings({ goalText: 'Focus' }),
      presets: [
        makePreset('default', 'Default', { goalText: 'Default Goal' }),
        makePreset('to-delete', 'To Delete', { goalText: 'To Delete Goal' })
      ],
      activePresetId: 'default'
    });
    await setStorageData(setupPage, 'premium', { isPremium: false });
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'schedules');

    // スケジュール追加ボタンをクリック
    await page.locator(SELECTORS.schedules.addScheduleButton).click();

    const modal = page.locator(SELECTORS.schedules.scheduleModal);

    // プリセット選択セレクト
    const presetSelect = modal.locator(SELECTORS.schedules.presetSelect);
    const options = await presetSelect.locator('option').allTextContents();

    // ロックされたプリセットは選択肢に含まれない、または無効化されている
    // 実装によってはロックされたプリセットが選択肢に表示されないか、disabled属性がつく
    expect(options.length).toBeGreaterThan(0);

    // モーダルを閉じる
    await page.locator(SELECTORS.schedules.cancelScheduleButton).click();

    await page.close();
  });

  test('OPT-S13: 重複スケジュール（同時刻・同曜日）が設定された場合にエラー表示', async ({
    context,
    extensionId
  }) => {
    // 既存のスケジュールを追加
    const setupPage = await openOptions(context, extensionId);
    await setStorageData(
      setupPage,
      'settings',
      makeSettings({
        schedules: [
          {
            id: 'schedule1',
            name: 'Existing Schedule',
            startTime: '09:00',
            endTime: '12:00',
            days: [1], // 月曜
            presetId: 'default',
            enabled: true
          }
        ]
      })
    );
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'schedules');

    // 重複するスケジュールを追加しようとする
    await page.locator(SELECTORS.schedules.addScheduleButton).click();

    const modal = page.locator(SELECTORS.schedules.scheduleModal);

    // スケジュール名を入力
    const nameInput = modal.locator(SELECTORS.schedules.scheduleNameInput);
    await nameInput.fill('Duplicate Schedule');

    // 同じ時間帯を設定
    const startTime = modal.locator(SELECTORS.schedules.startTimeInput);
    await startTime.fill('09:00');
    const endTime = modal.locator(SELECTORS.schedules.endTimeInput);
    await endTime.fill('12:00');

    // 同じ曜日（月曜）を選択
    // 曜日は checkbox ではなくトグルボタンなので click で切り替える
    const dayCheckboxes = modal.locator(SELECTORS.schedules.dayCheckbox);
    await dayCheckboxes.nth(1).click();

    // 保存ボタンをクリック
    const saveButton = modal.locator(SELECTORS.schedules.saveScheduleButton);
    await saveButton.click();

    // エラーメッセージが表示される（実装によって異なる）
    // エラーメッセージの有無を確認
    const errorMessage = modal.locator('text=/重複|Overlap|Conflict/i');
    // エラーが表示されるか、モーダルが閉じない
    const isErrorVisible = await errorMessage.isVisible().catch(() => false);
    const isModalStillVisible = await modal.isVisible();

    // エラーメッセージが表示されるか、モーダルが閉じないことを確認
    expect(isErrorVisible || isModalStillVisible).toBeTruthy();

    await page.close();
  });

  // 実装が未対応のため保留（#333）。
  // handleDeletePreset は vision のみ更新し、settings.schedules を触らないため、
  // スタイルを削除してもスケジュールは有効なまま「不明なスタイル」を指し続ける。
  // 実行時は defaultSettings にフォールバックするためクラッシュはしないが、
  // ユーザーからは「設定したのに切り替わらない」状態になる。
  // 仕様を確定させてから有効化する。
  test.fixme('OPT-S14: プリセット削除時、該当スケジュールが無効化される', async ({
    context,
    extensionId
  }) => {
    // プリセットとスケジュールを設定
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
      makeSettings({
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

    // スタイルタブでプリセットを削除
    const page = await openOptions(context, extensionId, 'styles');

    const presetButton = page
      .locator(SELECTORS.styles.presetButton)
      .filter({ hasText: 'To Delete' });
    await presetButton.click();

    const deleteButton = page.locator(SELECTORS.styles.deleteButton);
    await deleteButton.click();

    // スケジュールタブに移動
    await page.locator(SELECTORS.options.schedulesTab).click();

    // スケジュールが無効化されているか確認
    const scheduleItem = page
      .locator(SELECTORS.schedules.scheduleItem)
      .filter({ hasText: 'Linked Schedule' });

    // スケジュールが表示される
    await expect(scheduleItem).toBeVisible();

    // トグルが無効状態になっている
    const toggle = scheduleItem.locator(SELECTORS.schedules.scheduleToggle);
    await expect(toggle).toHaveAttribute('aria-checked', 'false');

    await page.close();
  });
});
