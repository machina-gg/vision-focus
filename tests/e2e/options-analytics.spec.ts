import type { Locator, Page } from '@playwright/test';

import { test, expect } from './fixtures/extension';
import {
  openOptions,
  setupTestStorage,
  clearStorage,
  setStorageData,
  makeAppSettings,
  makeActivity,
  getStorageData,
  SELECTORS,
  UI_TEXT,
  makeSites
} from './helpers';

// 表示される滞在時間の期待値は実装と同じ関数で組み立てる
// （整形の仕様が変わってもテストが壊れないようにするため。
//   「0 秒でも通る」ことを防ぐのは秒数を固定していることの方）
import { formatTime } from '~/lib/time';

/**
 * E2Eテスト: Options - Analytics Tab
 *
 * OPT-A01 ~ OPT-A12 のテストケースを実装
 */

/**
 * 保存済みの事実の表（activity）から、行のあるサイトキーの一覧を読む（日付をまたいで重複なし）
 *
 * ⚠ 読めなかったときに空の値へフォールバックしない。フォールバックすると
 * キー名を間違えたままでも「0 件」を返し、リセットの検査が素通りする（#411）。
 * 消えている（未保存）ことが分かる null を返し、呼び出し側のアサーションで見分ける。
 */
async function readActivitySiteKeys(page: Page): Promise<string[] | null> {
  const log = await getStorageData(page, 'activity');
  if (!log) return null;
  return [...new Set(Object.values(log).flatMap((row) => Object.keys(row)))];
}

/**
 * サイト別ランキングの N 位に表示されているドメインを指す
 *
 * ランキングの行は「順位バッジ + ドメイン + ブロック回数」で、行を指す
 * data-testid は無い。ページ全体から探すと追跡中一覧の同じドメインにも
 * 一致するため、見出しからドキュメント順で順位バッジをたどり、その隣の
 * ドメインを読む。
 *
 * ⚠ 構造が変われば一致する要素が無くなって落ちる。範囲指定を `xpath=../..`
 * のように「何階層上」で書くと、構造が変わったときに範囲が広がり、
 * ページのどこかに文字列があるだけで通ってしまう（#441）
 */
function rankingDomainAt(page: Page, rank: number): Locator {
  return page
    .locator(SELECTORS.analytics.siteRankingList)
    .locator(
      `xpath=following::span[normalize-space(text())="${rank}"][1]/following-sibling::span[1]`
    );
}

/**
 * サイト別ランキングの種（youtube.com: 10 回 > reddit.com: 5 回）を置く
 *
 * ランキングは追跡中のサイトの activity から出る。種に置くサイトは追跡中のサイトにも
 * 入れる（ブロック中として置き、再ブロック・停止のボタンは出さない）。
 */
async function seedBlockRanking(page: Page): Promise<void> {
  await setStorageData(
    page,
    'sites',
    makeSites([
      { domain: 'youtube.com', block: {} },
      { domain: 'reddit.com', block: {} }
    ])
  );
  await setStorageData(
    page,
    'activity',
    makeActivity([
      ['youtube.com', { blocks: 6 }],
      ['youtube.com', { blocks: 4 }, 3],
      ['reddit.com', { blocks: 5 }, 1]
    ])
  );
}

test.describe('Options - Analytics Tab', () => {
  test.beforeEach(async ({ context, extensionId }) => {
    // 各テストの前にストレージをセットアップ
    const page = await openOptions(context, extensionId);
    await clearStorage(page);
    await setupTestStorage(page, {
      withGoal: true,
      withAnalyticsOptIn: true
    });
    // サイトランキングはブロック回数が無いと描画されないため用意する
    // （SiteRankingList はランキングが空なら null を返す）
    await seedBlockRanking(page);
    await page.close();
  });

  test('OPT-A01: 分析タブが表示される', async ({ context, extensionId }) => {
    const page = await openOptions(context, extensionId, 'analytics');

    // 分析タブが表示される
    await expect(page.locator(SELECTORS.options.analyticsTab)).toBeVisible();

    // サイトランキングセクションが表示される
    await expect(
      page.locator(SELECTORS.analytics.siteRankingList)
    ).toBeVisible();

    await page.close();
  });

  test('OPT-A02: サイト別ランキングが表示される', async ({
    context,
    extensionId
  }) => {
    // テスト用の分析データを追加。
    // youtube.com は 2 日に分けて置き、日をまたいで足し上げることも見る
    const setupPage = await openOptions(context, extensionId);
    await setupTestStorage(setupPage, {
      withGoal: true,
      withAnalyticsOptIn: true
    });
    await seedBlockRanking(setupPage);
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'analytics');

    // サイトランキングが表示される
    await expect(
      page.locator(SELECTORS.analytics.siteRankingList)
    ).toBeVisible();

    // ブロック回数の多い順に並ぶ（youtube.com: 10 回 > reddit.com: 5 回）
    await expect(rankingDomainAt(page, 1)).toHaveText('youtube.com');
    await expect(rankingDomainAt(page, 2)).toHaveText('reddit.com');

    await page.close();
  });

  test('OPT-A03: 追跡中のサイト一覧が表示される', async ({
    context,
    extensionId
  }) => {
    // 一覧の行は追跡中のサイト。状態は block === null（追跡だけ）/ block.enabled（ブロック中 / 無効）で分かれる
    const setupPage = await openOptions(context, extensionId);
    await setStorageData(
      setupPage,
      'sites',
      makeSites([
        { domain: 'youtube.com' },
        { domain: 'blocked.com', block: {} },
        { domain: 'paused.com', block: { enabled: false } }
      ])
    );
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'analytics');

    // 追跡中のサイト一覧セクションが表示される
    const trackedSection = page
      .locator(SELECTORS.analytics.trackedSitesList)
      .locator('xpath=..');
    await expect(trackedSection).toBeVisible();

    // 追跡中一覧に対象ドメインが表示される
    await expect(trackedSection).toContainText('youtube.com');

    // 行はブロック中 → 無効 → 追跡だけの順に並び、状態は行の属性に出る
    const rows = page.locator(SELECTORS.analytics.trackedSite);
    await expect(rows).toHaveCount(3);
    await expect(rows.nth(0)).toHaveAttribute('data-status', 'blocked');
    await expect(rows.nth(0)).toContainText('blocked.com');
    await expect(rows.nth(1)).toHaveAttribute('data-status', 'disabled');
    await expect(rows.nth(1)).toContainText('paused.com');
    await expect(rows.nth(2)).toHaveAttribute('data-status', 'tracking');
    await expect(rows.nth(2)).toContainText('youtube.com');

    // トグルで無効にしたサイトは再ブロックだけを出す（ブロック設定を消すのはブロックリストタブの経路だけ）。
    // ブロック中の行には再ブロックも出さない
    await expect(
      rows.nth(1).locator(SELECTORS.analytics.reblockButton)
    ).toBeVisible();
    await expect(
      rows.nth(1).locator(SELECTORS.analytics.stopTrackingButton)
    ).toHaveCount(0);
    await expect(
      rows.nth(0).locator(SELECTORS.analytics.reblockButton)
    ).toHaveCount(0);

    await page.close();
  });

  test('OPT-A04: 浪費時間セクションにサイト別の時間が表示される', async ({
    context,
    extensionId
  }) => {
    // 解除後の時間は activity から出る: 最後に解除した日（2 日前）から今日までの表示秒数。
    // 解除より前の日（5 日前）の時間は入らない
    const wastedSeconds = 7200; // 2 時間
    const setupPage = await openOptions(context, extensionId);
    await setStorageData(
      setupPage,
      'sites',
      makeSites([{ domain: 'reddit.com' }])
    );
    await setStorageData(
      setupPage,
      'activity',
      makeActivity([
        ['reddit.com', { seconds: 999 }, 5],
        ['reddit.com', { seconds: 3600, unblocks: 1 }, 2],
        ['reddit.com', { seconds: wastedSeconds - 3600 }]
      ])
    );
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'analytics');

    // 追跡中のサイト一覧セクションが表示される
    await expect(
      page.locator(SELECTORS.analytics.trackedSitesList)
    ).toBeVisible();

    // 追跡中のサイトとして reddit.com が表示される
    const trackedSection = page
      .locator(SELECTORS.analytics.trackedSitesList)
      .locator('xpath=..');
    await expect(trackedSection).toContainText('reddit.com');

    // 保存した滞在時間そのものが表示される。
    // 「数字 + 単位」の正規表現だと 0 秒表示や別の行の日付でも通る
    await expect(trackedSection).toContainText(formatTime(wastedSeconds));

    await page.close();
  });

  test('OPT-A05: 解除サイトを再ブロックできる', async ({
    context,
    extensionId
  }) => {
    // ブロックリストから外した（追跡だけの）サイトを置く
    const setupPage = await openOptions(context, extensionId);
    await setStorageData(
      setupPage,
      'sites',
      makeSites([{ domain: 'twitter.com' }])
    );
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'analytics');

    // twitter.com が追跡中のサイト一覧に表示される
    const unblockItem = page.locator('text=/twitter.com/i').first();
    await expect(unblockItem).toBeVisible();

    // 再ブロックボタンをクリック
    const reblockButton = page
      .locator(SELECTORS.analytics.reblockButton)
      .first();
    await reblockButton.click();

    // 追跡中のサイトに有効なブロック設定が足される（保存は background なので反映を待つ）
    await expect
      .poll(async () => {
        const sites = await getStorageData(page, 'sites');
        return sites?.['twitter.com']?.block?.enabled ?? null;
      })
      .toBe(true);

    await page.close();
  });

  test('OPT-A06: トラッキング停止ができる', async ({
    context,
    extensionId
  }) => {
    // ブロックリストから外した（追跡だけの）サイトと、ブロックをトグルで無効にしたサイトを置く
    // （停止できるのは追跡だけのサイト。無効のサイトはブロック設定ごと残る）
    const setupPage = await openOptions(context, extensionId);
    await setStorageData(
      setupPage,
      'sites',
      makeSites([
        { domain: 'reddit.com' },
        { domain: 'paused.com', block: { enabled: false } }
      ])
    );
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'analytics');

    // 停止前は追跡中の一覧に reddit.com が並ぶ。
    // ⚠ ページ全体から reddit.com を探さない。サイト別ランキングにも
    //    同じドメインが出るため、停止後も一致が残る（一致が複数になると
    //    isVisible() は strict mode 違反で落ちる。従来はそれを握りつぶす
    //    catch が付いており、失敗が「合格」に変換されていた。#441）
    const trackedSection = page
      .locator(SELECTORS.analytics.trackedSitesList)
      .locator('xpath=..');
    await expect(trackedSection).toContainText('reddit.com');

    // 行ごとのトラッキング停止ボタンを押す
    const stopButtonOf = (domain: string) =>
      page
        .locator(SELECTORS.analytics.trackedSite)
        .filter({ hasText: domain })
        .locator(SELECTORS.analytics.stopTrackingButton);
    await stopButtonOf('reddit.com').click();

    // 追跡中のサイトから当該ドメインが消える。
    // 消すのは停止ボタンの経路だけ（stop-tracking ハンドラ）
    await expect
      .poll(async () =>
        Object.keys((await getStorageData(page, 'sites')) ?? {})
      )
      .not.toContain('reddit.com');

    // 無効にしたサイトには停止ボタンを出さず、保存値にもブロック設定ごと残る
    await expect(stopButtonOf('paused.com')).toHaveCount(0);
    expect(
      (await getStorageData(page, 'sites'))?.['paused.com']?.block
    ).toEqual(expect.objectContaining({ enabled: false }));

    // 保存内容から描き直させて、画面からも消えていることを確かめる
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // 一覧には無効にしたサイトだけが残る
    await expect(page.locator(SELECTORS.analytics.trackedSite)).toHaveCount(1);
    await expect(page.locator(SELECTORS.analytics.trackedSite)).toContainText(
      'paused.com'
    );

    await page.close();
  });

  test('OPT-A07: 新規サイトをトラッキングに追加できる', async ({
    context,
    extensionId
  }) => {
    const page = await openOptions(context, extensionId, 'analytics');

    // サイト追加セクションが表示される
    const addSiteInput = page.locator(SELECTORS.analytics.addSiteInput);
    await expect(addSiteInput).toBeVisible();

    // サイトを入力
    await addSiteInput.fill('example.com');

    // 追加ボタンをクリック
    const addButton = page.locator(SELECTORS.analytics.addSiteButton);
    await addButton.click();

    // ストレージに保存されたことを確認（保存は非同期なので反映を待つ）
    await expect
      .poll(
        async () => Object.keys((await getStorageData(page, 'sites')) ?? {}),
        { timeout: 10000 }
      )
      .toContain('example.com');

    // 追加できたら入力欄は空に戻り、拒否の理由は出ない
    await expect(addSiteInput).toHaveValue('');
    await expect(page.locator(SELECTORS.analytics.addSiteError)).toHaveCount(0);

    // 拒否されたら追跡中のサイトは増えも減りもしない。beforeEach の種
    // （seedBlockRanking）も含むので、期待値は拒否の前に読んだ集合で持つ
    const keysBeforeRejection = Object.keys(
      (await getStorageData(page, 'sites')) ?? {}
    ).sort();

    // 追跡中のサイトに含まれるサブドメインは入れ子として拒否され、理由が画面に出る
    await addSiteInput.fill('m.example.com');
    await addButton.click();

    const error = page.locator(SELECTORS.analytics.addSiteError);
    await expect(error).toBeVisible();
    await expect(error).toContainText('m.example.com');
    await expect(error).toContainText('example.com');
    // 理由を読んで直せるよう、入力は残る
    await expect(addSiteInput).toHaveValue('m.example.com');
    expect(
      Object.keys((await getStorageData(page, 'sites')) ?? {}).sort()
    ).toEqual(keysBeforeRejection);

    await page.close();
  });

  test('OPT-A08: Analytics データをリフレッシュできる', async ({
    context,
    extensionId
  }) => {
    // リフレッシュ / リセット / エクスポートは分析セクション内にある
    const setupPage = await openOptions(context, extensionId);
    await setupTestStorage(setupPage, {
      withGoal: true,
      withAnalyticsOptIn: true
    });
    await setStorageData(
      setupPage,
      'sites',
      makeSites([{ domain: 'youtube.com', block: {} }])
    );
    await setStorageData(
      setupPage,
      'activity',
      makeActivity([['youtube.com', { seconds: 600, blocks: 3 }]])
    );
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'analytics');

    // リフレッシュボタンが表示される
    const refreshButton = page.locator(SELECTORS.analytics.refreshButton);
    await expect(refreshButton).toBeVisible();

    // リフレッシュボタンをクリック
    await refreshButton.click();

    // ボタンがクリック可能（エラーが発生しない）
    // データのリロードは内部的に実行される

    await page.close();
  });

  test('OPT-A09: Analytics データをリセットできる', async ({
    context,
    extensionId
  }) => {
    // テスト用の事実を追加する（今日と過去の日。リセットは今日の分も含めて全部消す）
    const setupPage = await openOptions(context, extensionId);
    await setStorageData(
      setupPage,
      'sites',
      makeSites([{ domain: 'youtube.com' }, { domain: 'reddit.com' }])
    );
    await setStorageData(
      setupPage,
      'activity',
      makeActivity([
        ['youtube.com', { blocks: 10 }, 0],
        ['reddit.com', { blocks: 5 }, 3]
      ])
    );
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'analytics');

    // リセット前に集計が入っていることを確かめる。
    // 空の状態から空を見ても「リセットされた」ことにはならない（#411）
    expect(await readActivitySiteKeys(page)).toEqual(
      expect.arrayContaining(['youtube.com', 'reddit.com'])
    );

    // リセットボタンが表示される
    const resetButton = page.locator(SELECTORS.analytics.resetButton);
    await expect(resetButton).toBeVisible();

    // リセットボタンをクリックすると確認モーダルが開く
    await resetButton.click();

    // 確認モーダルの実行ボタンを押すまでリセットは走らない
    // （window.confirm ではなくアプリ内のモーダル。
    //   src/components/options/analytics/AnalyticsExportBar.tsx）
    const resetConfirmButton = page.locator(
      SELECTORS.analytics.resetConfirmButton
    );
    await expect(resetConfirmButton).toBeVisible();
    await resetConfirmButton.click();

    // 事実の表が消える。消すのは background なので、反映されるまで待つ
    await expect.poll(() => readActivitySiteKeys(page)).toBeNull();

    await page.close();
  });

  test('OPT-A10: CSV エクスポートができる（ブロックリスト・統計データ）', async ({
    context,
    extensionId
  }) => {
    // テスト用のデータを追加。
    // ブロックリストは追跡中のサイト（sites）のブロック設定、エクスポートは分析セクション内
    const setupPage = await openOptions(context, extensionId);
    await setupTestStorage(setupPage, {
      withGoal: true,
      withAnalyticsOptIn: true
    });
    await setStorageData(
      setupPage,
      'settings',
      makeAppSettings({
        analyticsOptIn: { enabled: true, decidedAt: new Date().toISOString() }
      })
    );
    // youtube.com はブロック中のサイト一覧に出さないので、一覧に出るサイトで確かめる
    await setStorageData(
      setupPage,
      'sites',
      makeSites([{ domain: 'reddit.com', block: {} }])
    );
    // reddit.com はブロックリストにあるので追跡中。統計の CSV はその activity から出る
    await setStorageData(
      setupPage,
      'activity',
      makeActivity([['reddit.com', { seconds: 600, blocks: 3 }]])
    );
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'analytics');

    // エクスポートボタンが表示される
    const exportButton = page.locator(SELECTORS.analytics.exportButton);
    await expect(exportButton).toBeVisible();

    // エクスポートはドロップダウンを開いてから項目を選ぶ
    await exportButton.click();

    // 統計データ（ブロック回数・日別統計）も activity から書き出せる
    await expect(
      page.locator(SELECTORS.analytics.exportBlockCounts)
    ).toBeEnabled();
    await expect(
      page.locator(SELECTORS.analytics.exportDailyStats)
    ).toBeEnabled();

    // クリックより前に待ち受けを開始しないとイベントを取りこぼす
    const downloadPromise = page.waitForEvent('download');
    await page.click(SELECTORS.analytics.exportBlocklist);

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.csv');

    await page.close();
  });

  test('OPT-A11: Unblock History の CSV エクスポートができる', async ({
    context,
    extensionId
  }) => {
    const setupPage = await openOptions(context, extensionId);
    await setupTestStorage(setupPage, {
      withGoal: true,
      withAnalyticsOptIn: true
    });
    // 解除サイトの CSV は activity の解除の記録から出る
    await setStorageData(
      setupPage,
      'sites',
      makeSites([{ domain: 'youtube.com' }])
    );
    await setStorageData(
      setupPage,
      'activity',
      makeActivity([['youtube.com', { seconds: 3600, unblocks: 1 }]])
    );
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'analytics');

    // エクスポートはドロップダウンを開いてから項目を選ぶ
    await page.click(SELECTORS.analytics.exportButton);

    const exportUnblocked = page.locator(SELECTORS.analytics.exportUnblocked);
    await expect(exportUnblocked).toBeEnabled();

    // クリックより前に待ち受けを開始しないとイベントを取りこぼす
    const downloadPromise = page.waitForEvent('download');
    await exportUnblocked.click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.csv');

    await page.close();
  });

  test('OPT-A12: 週次・月次レポートをタブで切り替え、見ていた期間を保つ', async ({
    context,
    extensionId
  }) => {
    const page = await openOptions(context, extensionId, 'analytics');

    const weeklyTab = page.locator(SELECTORS.analytics.weeklyReportTab);
    const monthlyTab = page.locator(SELECTORS.analytics.monthlyReportTab);
    const previousWeek = page.getByRole('button', {
      name: UI_TEXT.reports.previousWeek
    });
    const nextWeek = page.getByRole('button', {
      name: UI_TEXT.reports.nextWeek
    });
    const previousMonth = page.getByRole('button', {
      name: UI_TEXT.reports.previousMonth
    });

    // 最初は週次だけが表示される
    await expect(weeklyTab).toHaveAttribute('aria-selected', 'true');
    await expect(previousWeek).toBeVisible();
    await expect(previousMonth).toHaveCount(0);

    // 前の週へ戻ると次の週へ進めるようになる（= 今週以外を見ている）
    await expect(nextWeek).toBeDisabled();
    await previousWeek.click();
    await expect(nextWeek).toBeEnabled();

    // 月次へ切り替えると週次は表示されない
    await monthlyTab.click();
    await expect(monthlyTab).toHaveAttribute('aria-selected', 'true');
    await expect(previousMonth).toBeVisible();
    await expect(previousWeek).toHaveCount(0);

    // 週次へ戻っても戻した週のまま
    await weeklyTab.click();
    await expect(nextWeek).toBeEnabled();

    await page.close();
  });
});
