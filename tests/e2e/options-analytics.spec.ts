import type { Locator, Page } from '@playwright/test';

import { test, expect } from './fixtures/extension';
import {
  openOptions,
  setupTestStorage,
  clearStorage,
  setStorageData,
  makeSettings,
  makeAnalytics,
  makeSiteBlockCounts,
  getStorageData,
  SELECTORS
} from './helpers';

// 表示される滞在時間の期待値は実装と同じ関数で組み立てる
// （整形の仕様が変わってもテストが壊れないようにするため。
//   「0 秒でも通る」ことを防ぐのは秒数を固定していることの方）
import { formatTime } from '~/lib/time';

/**
 * E2Eテスト: Options - Analytics Tab
 *
 * OPT-A01 ~ OPT-A11 のテストケースを実装
 */

/**
 * 保存済みの analytics から siteBlockCounts のキー一覧を読む
 *
 * 保存キーは 'analytics' で、その直下が AnalyticsData（`analyticsData` という
 * ラッパーは存在しない）。siteBlockCounts はドメインをキーとするオブジェクトなので
 * 件数は `Object.keys` で数える。
 *
 * ⚠ 読めなかったときに空の値へフォールバックしない。フォールバックすると
 * キー名を間違えたままでも「0 件」を返し、リセットの検査が素通りする（#411）。
 * 読めなかったことが分かる null を返し、呼び出し側のアサーションで落とす。
 */
async function readSiteBlockCountKeys(page: Page): Promise<string[] | null> {
  const analytics = await getStorageData(page, 'analytics');
  const siteBlockCounts = analytics?.siteBlockCounts;
  if (!siteBlockCounts || typeof siteBlockCounts !== 'object') {
    return null;
  }
  return Object.keys(siteBlockCounts);
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

test.describe('Options - Analytics Tab', () => {
  test.beforeEach(async ({ context, extensionId }) => {
    // 各テストの前にストレージをセットアップ
    const page = await openOptions(context, extensionId);
    await clearStorage(page);
    await setupTestStorage(page, {
      withGoal: true,
      withAnalyticsOptIn: true
    });
    // サイトランキングは集計データが無いと描画されないため用意する
    // （SiteRankingList は topBlockedSites.length === 0 で null を返す）
    await setStorageData(
      page,
      'analytics',
      makeAnalytics({
        siteBlockCounts: makeSiteBlockCounts([
          ['youtube.com', 10],
          ['reddit.com', 5]
        ])
      })
    );
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
    const setupPage = await openOptions(context, extensionId);
    await setupTestStorage(setupPage, {
      withGoal: true,
      withAnalyticsOptIn: true
    });
    await setStorageData(
      setupPage,
      'analytics',
      makeAnalytics({
        siteBlockCounts: makeSiteBlockCounts([
          ['youtube.com', 10],
          ['reddit.com', 5]
        ])
      })
    );
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
    // テスト用の解除履歴データを追加
    const setupPage = await openOptions(context, extensionId);
    await setStorageData(setupPage, 'unblockHistory', {
      sites: {
        'youtube.com': {
          domain: 'youtube.com',
          status: 'unblocked',
          blockedAt: '2024-01-01T00:00:00.000Z',
          unblockedAt: '2024-01-01T10:00:00.000Z',
          timeAfterUnblock: 3600,
          lastActivity: '2024-01-01T11:00:00.000Z'
        }
      }
    });
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'analytics');

    // 追跡中のサイト一覧セクションが表示される
    const trackedSection = page
      .locator(SELECTORS.analytics.trackedSitesList)
      .locator('xpath=..');
    await expect(trackedSection).toBeVisible();

    // 追跡中一覧に対象ドメインが表示される
    await expect(trackedSection).toContainText('youtube.com');

    await page.close();
  });

  test('OPT-A04: 浪費時間セクションにサイト別の時間が表示される', async ({
    context,
    extensionId
  }) => {
    // テスト用の解除履歴データを追加
    const wastedSeconds = 7200; // 2 時間
    const setupPage = await openOptions(context, extensionId);
    await setStorageData(setupPage, 'unblockHistory', {
      sites: {
        'reddit.com': {
          domain: 'reddit.com',
          status: 'unblocked',
          blockedAt: '2024-01-01T00:00:00.000Z',
          unblockedAt: '2024-01-01T10:00:00.000Z',
          timeAfterUnblock: wastedSeconds,
          lastActivity: '2024-01-01T12:00:00.000Z'
        }
      }
    });
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
    // テスト用の解除履歴データを追加
    const setupPage = await openOptions(context, extensionId);
    await setStorageData(setupPage, 'unblockHistory', {
      sites: {
        'twitter.com': {
          domain: 'twitter.com',
          status: 'unblocked',
          blockedAt: '2024-01-01T00:00:00.000Z',
          unblockedAt: '2024-01-01T10:00:00.000Z',
          timeAfterUnblock: 1800,
          lastActivity: '2024-01-01T10:30:00.000Z'
        }
      }
    });
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'analytics');

    // twitter.com の解除履歴が表示される
    const unblockItem = page.locator('text=/twitter.com/i').first();
    await expect(unblockItem).toBeVisible();

    // 再ブロックボタンをクリック
    const reblockButton = page
      .locator(SELECTORS.analytics.reblockButton)
      .first();
    await reblockButton.click();

    // サイトがブロックリストに追加される
    // ブロックリストは独立したキーではなく settings 配下にある
    const settings = (await getStorageData(page, 'settings')) as {
      blockList?: unknown[];
    } | null;

    expect(settings?.blockList ?? []).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          domain: 'twitter.com',
          enabled: true
        })
      ])
    );

    await page.close();
  });

  test('OPT-A06: トラッキング停止ができる', async ({
    context,
    extensionId
  }) => {
    // テスト用の解除履歴データを追加
    const setupPage = await openOptions(context, extensionId);
    await setStorageData(setupPage, 'unblockHistory', {
      sites: {
        'reddit.com': {
          domain: 'reddit.com',
          status: 'unblocked',
          blockedAt: '2024-01-01T00:00:00.000Z',
          unblockedAt: '2024-01-01T10:00:00.000Z',
          timeAfterUnblock: 1800,
          lastActivity: '2024-01-01T10:30:00.000Z'
        }
      }
    });
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

    // トラッキング停止ボタンをクリック
    const stopButton = page
      .locator(SELECTORS.analytics.stopTrackingButton)
      .first();
    await stopButton.click();

    // 解除履歴から当該ドメインが消える。
    // このキーを消すのは停止ボタンの経路だけ（useAnalytics の handleStopTracking）
    await expect
      .poll(async () => {
        const history = await getStorageData(page, 'unblockHistory');
        return Object.keys(history?.sites ?? {});
      })
      .not.toContain('reddit.com');

    // 保存内容から描き直させて、画面からも消えていることを確かめる
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // 追跡中のサイトが 0 件になると一覧そのものが描画されない
    // （AnalyticsSummary は hasTrackedSites が false なら空状態を出す）
    await expect(
      page.locator(SELECTORS.analytics.trackedSitesList)
    ).toHaveCount(0);

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
        async () => {
          const history = await getStorageData(page, 'unblockHistory');
          return Object.keys(history?.sites ?? {});
        },
        { timeout: 10000 }
      )
      .toContain('example.com');

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
      'analytics',
      makeAnalytics({
        siteBlockCounts: makeSiteBlockCounts([['youtube.com', 10]]),
        dailyStats: {
          [new Date().toISOString().slice(0, 10)]: {
            date: new Date().toISOString().slice(0, 10),
            wasteTime: 600,
            investTime: 0,
            blockCount: 3,
            unblockCount: 0
          }
        }
      })
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
    // テスト用の分析データを追加
    const setupPage = await openOptions(context, extensionId);
    await setStorageData(
      setupPage,
      'analytics',
      makeAnalytics({
        siteBlockCounts: makeSiteBlockCounts([
          ['youtube.com', 10],
          ['reddit.com', 5]
        ])
      })
    );
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'analytics');

    // リセット前に集計が入っていることを確かめる。
    // 空の状態から空を見ても「リセットされた」ことにはならない（#411）
    expect(await readSiteBlockCountKeys(page)).toEqual(
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

    // 保存済みの集計が空になる。
    // 書き込みは非同期なので、反映されるまで待つ
    await expect.poll(() => readSiteBlockCountKeys(page)).toEqual([]);

    await page.close();
  });

  test('OPT-A10: CSV エクスポートができる（ブロックリスト・統計データ）', async ({
    context,
    extensionId
  }) => {
    // テスト用のデータを追加。
    // ブロックリストは settings 配下、エクスポートは分析セクション内
    const setupPage = await openOptions(context, extensionId);
    await setupTestStorage(setupPage, {
      withGoal: true,
      withAnalyticsOptIn: true
    });
    await setStorageData(
      setupPage,
      'settings',
      makeSettings({
        blockList: [
          {
            id: '1',
            domain: 'youtube.com',
            isWildcard: false,
            createdAt: new Date().toISOString(),
            enabled: true
          }
        ],
        analyticsOptIn: { enabled: true, decidedAt: new Date().toISOString() }
      })
    );
    await setStorageData(
      setupPage,
      'analytics',
      makeAnalytics({
        siteBlockCounts: makeSiteBlockCounts([['youtube.com', 10]]),
        dailyStats: {
          [new Date().toISOString().slice(0, 10)]: {
            date: new Date().toISOString().slice(0, 10),
            wasteTime: 600,
            investTime: 0,
            blockCount: 3,
            unblockCount: 0
          }
        }
      })
    );
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'analytics');

    // エクスポートボタンが表示される
    const exportButton = page.locator(SELECTORS.analytics.exportButton);
    await expect(exportButton).toBeVisible();

    // エクスポートはドロップダウンを開いてから項目を選ぶ
    await exportButton.click();

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
    await setStorageData(setupPage, 'unblockHistory', {
      sites: {
        'youtube.com': {
          domain: 'youtube.com',
          status: 'unblocked',
          blockedAt: '2024-01-01T00:00:00.000Z',
          unblockedAt: '2024-01-01T10:00:00.000Z',
          timeAfterUnblock: 3600,
          lastActivity: '2024-01-01T11:00:00.000Z'
        }
      }
    });
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
});
