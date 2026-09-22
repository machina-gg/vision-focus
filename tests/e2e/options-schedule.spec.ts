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

    // 曜日ボタンが 7 つ並ぶ（ScheduleModal の DAY_KEYS が日〜土の 7 件）。
    // count() は自動リトライしないため toHaveCount で待つ
    const dayCheckboxes = modal.locator(SELECTORS.schedules.dayCheckbox);
    await expect(dayCheckboxes).toHaveCount(7);

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
    // 現在時刻を含む窓を作り、スケジュールの時間帯内であることを保証する
    // （夜またぎは扱わず、23 時台だけ終了時刻を 00:00 にする）
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
      makeSettings({
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

    // 時間帯内: スケジュールのプリセットが自動適用される
    const activePage = await openNewTab(context, extensionId);
    await expect(activePage.locator(SELECTORS.newtab.goalText)).toContainText(
      'Work Mode Goal'
    );
    await activePage.close();

    // スケジュールを無効化すると、時間外と同じ扱いになり activePresetId に戻る
    const disablePage = await openOptions(context, extensionId);
    await setStorageData(
      disablePage,
      'settings',
      makeSettings({
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

  test('OPT-S12: 全てのスタイルがスケジュールで選択できる', async ({
    context,
    extensionId
  }) => {
    // ロックの概念は存在しないため、作成した全スタイルが選択肢に並ぶ
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

    // 3 件すべてが選択肢に並び、無効化されていない
    for (const name of ['Default', 'Second', 'Third']) {
      const option = options.filter({ hasText: name });
      await expect(option).toHaveCount(1);
      await expect(option).not.toBeDisabled();
    }

    await page.locator(SELECTORS.schedules.cancelScheduleButton).click();

    await page.close();
  });

  // 実装に重複の検証が無いため保留（#441 で判明）。
  // useSchedules の handleSaveSchedule は既存のスケジュールと突き合わせずに
  // 保存し、モーダルを閉じる。重複を伝える文言も messages.json に無い
  // （ヘルプは「重複しないようにする」ことをユーザーの責任として書いている）。
  // 従来は「エラーが出る or モーダルが開いたまま」の OR 判定で、保存直後の
  // 一瞬だけモーダルが残っていることに依存して通っていた（報告された flaky の
  // 構造的な説明）。重複を弾くのか許すのかは仕様の判断が要るため、
  // 決まるまで実行しない。
  test.fixme('OPT-S13: 重複スケジュール（同時刻・同曜日）が設定された場合にエラー表示', async ({
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

    // 重複を伝えるエラーが表示され、モーダルは閉じない。
    // ⚠ 実装されたら、ここの文言は messages.json の実際のキーに差し替える
    await expect(modal.locator('text=/重複|Overlap|Conflict/i')).toBeVisible();
    await expect(modal).toBeVisible();

    await page.close();
  });

  test('OPT-S14: プリセット削除時、該当スケジュールのスタイル連携が解除される', async ({
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

    // 参照しているスケジュールがあるので確認モーダルが開き、件数が示される
    const confirmModal = page.locator(SELECTORS.styles.deletePresetModal);
    await expect(confirmModal).toBeVisible();
    await expect(
      page.locator(SELECTORS.styles.deletePresetScheduleCount)
    ).toContainText('1');

    // キャンセルすると削除されない
    await page.locator(SELECTORS.styles.deletePresetCancel).click();
    await expect(confirmModal).toBeHidden();
    await expect(presetButton).toBeVisible();

    // 改めて削除を確定する
    await deleteButton.click();
    await page.locator(SELECTORS.styles.deletePresetConfirm).click();
    await expect(confirmModal).toBeHidden();
    await expect(presetButton).toHaveCount(0);

    // スケジュールタブに移動
    await page.locator(SELECTORS.options.schedulesTab).click();

    const scheduleItem = page
      .locator(SELECTORS.schedules.scheduleItem)
      .filter({ hasText: 'Linked Schedule' });

    // スケジュール自体は残る
    await expect(scheduleItem).toBeVisible();

    // 有効・無効の状態は削除前のまま（有効）
    const toggle = scheduleItem.locator(SELECTORS.schedules.scheduleToggle);
    await expect(toggle).toHaveAttribute('aria-checked', 'true');

    // スタイル連携が外れ、「不明なスタイル」の表示も出ない
    await expect(
      scheduleItem.locator(SELECTORS.schedules.scheduleItemPreset)
    ).toHaveCount(0);

    await page.close();
  });
});
