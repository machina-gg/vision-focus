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

import { formatTime } from '~/lib/time';

async function readActivitySiteKeys(page: Page): Promise<string[] | null> {
  const log = await getStorageData(page, 'activity');
  if (!log) return null;
  return [...new Set(Object.values(log).flatMap((row) => Object.keys(row)))];
}

function rankingDomainAt(page: Page, rank: number): Locator {
  return page
    .locator(SELECTORS.analytics.siteRankingList)
    .locator(
      `xpath=following::span[normalize-space(text())="${rank}"][1]/following-sibling::span[1]`
    );
}

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
    const page = await openOptions(context, extensionId);
    await clearStorage(page);
    await setupTestStorage(page, {
      withGoal: true,
      withAnalyticsOptIn: true
    });
    await seedBlockRanking(page);
    await page.close();
  });

  test('OPT-A01: 分析タブが表示される', async ({ context, extensionId }) => {
    const page = await openOptions(context, extensionId, 'analytics');

    await expect(page.locator(SELECTORS.options.analyticsTab)).toBeVisible();

    await expect(
      page.locator(SELECTORS.analytics.siteRankingList)
    ).toBeVisible();

    await page.close();
  });

  test('OPT-A02: サイト別ランキングが表示される', async ({
    context,
    extensionId
  }) => {
    const setupPage = await openOptions(context, extensionId);
    await setupTestStorage(setupPage, {
      withGoal: true,
      withAnalyticsOptIn: true
    });
    await seedBlockRanking(setupPage);
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'analytics');

    await expect(
      page.locator(SELECTORS.analytics.siteRankingList)
    ).toBeVisible();

    await expect(rankingDomainAt(page, 1)).toHaveText('youtube.com');
    await expect(rankingDomainAt(page, 2)).toHaveText('reddit.com');

    await page.close();
  });

  test('OPT-A03: 追跡中のサイト一覧が表示される', async ({
    context,
    extensionId
  }) => {
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

    const trackedSection = page
      .locator(SELECTORS.analytics.trackedSitesList)
      .locator('xpath=..');
    await expect(trackedSection).toBeVisible();

    await expect(trackedSection).toContainText('youtube.com');

    const rows = page.locator(SELECTORS.analytics.trackedSite);
    await expect(rows).toHaveCount(3);
    await expect(rows.nth(0)).toHaveAttribute('data-status', 'blocked');
    await expect(rows.nth(0)).toContainText('blocked.com');
    await expect(rows.nth(1)).toHaveAttribute('data-status', 'disabled');
    await expect(rows.nth(1)).toContainText('paused.com');
    await expect(rows.nth(2)).toHaveAttribute('data-status', 'tracking');
    await expect(rows.nth(2)).toContainText('youtube.com');

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
    const wastedSeconds = 7200;
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

    await expect(
      page.locator(SELECTORS.analytics.trackedSitesList)
    ).toBeVisible();

    const trackedSection = page
      .locator(SELECTORS.analytics.trackedSitesList)
      .locator('xpath=..');
    await expect(trackedSection).toContainText('reddit.com');

    await expect(trackedSection).toContainText(formatTime(wastedSeconds));

    await page.close();
  });

  test('OPT-A05: 解除サイトを再ブロックできる', async ({
    context,
    extensionId
  }) => {
    const setupPage = await openOptions(context, extensionId);
    await setStorageData(
      setupPage,
      'sites',
      makeSites([{ domain: 'twitter.com' }])
    );
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'analytics');

    const unblockItem = page.locator('text=/twitter.com/i').first();
    await expect(unblockItem).toBeVisible();

    const reblockButton = page
      .locator(SELECTORS.analytics.reblockButton)
      .first();
    await reblockButton.click();

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

    const trackedSection = page
      .locator(SELECTORS.analytics.trackedSitesList)
      .locator('xpath=..');
    await expect(trackedSection).toContainText('reddit.com');

    const stopButtonOf = (domain: string) =>
      page
        .locator(SELECTORS.analytics.trackedSite)
        .filter({ hasText: domain })
        .locator(SELECTORS.analytics.stopTrackingButton);
    await stopButtonOf('reddit.com').click();

    await expect
      .poll(async () =>
        Object.keys((await getStorageData(page, 'sites')) ?? {})
      )
      .not.toContain('reddit.com');

    await expect(stopButtonOf('paused.com')).toHaveCount(0);
    expect(
      (await getStorageData(page, 'sites'))?.['paused.com']?.block
    ).toEqual(expect.objectContaining({ enabled: false }));

    await page.reload();
    await page.waitForLoadState('domcontentloaded');

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

    const addSiteInput = page.locator(SELECTORS.analytics.addSiteInput);
    await expect(addSiteInput).toBeVisible();

    await addSiteInput.fill('example.com');

    const addButton = page.locator(SELECTORS.analytics.addSiteButton);
    await addButton.click();

    await expect
      .poll(
        async () => Object.keys((await getStorageData(page, 'sites')) ?? {}),
        { timeout: 10000 }
      )
      .toContain('example.com');

    await expect(addSiteInput).toHaveValue('');
    await expect(page.locator(SELECTORS.analytics.addSiteError)).toHaveCount(0);

    const keysBeforeRejection = Object.keys(
      (await getStorageData(page, 'sites')) ?? {}
    ).sort();

    await addSiteInput.fill('m.example.com');
    await addButton.click();

    const error = page.locator(SELECTORS.analytics.addSiteError);
    await expect(error).toBeVisible();
    await expect(error).toContainText('m.example.com');
    await expect(error).toContainText('example.com');
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

    const refreshButton = page.locator(SELECTORS.analytics.refreshButton);
    await expect(refreshButton).toBeVisible();

    await refreshButton.click();

    await page.close();
  });

  test('OPT-A09: Analytics データをリセットできる', async ({
    context,
    extensionId
  }) => {
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

    expect(await readActivitySiteKeys(page)).toEqual(
      expect.arrayContaining(['youtube.com', 'reddit.com'])
    );

    const resetButton = page.locator(SELECTORS.analytics.resetButton);
    await expect(resetButton).toBeVisible();

    await resetButton.click();

    const resetConfirmButton = page.locator(
      SELECTORS.analytics.resetConfirmButton
    );
    await expect(resetConfirmButton).toBeVisible();
    await resetConfirmButton.click();

    await expect.poll(() => readActivitySiteKeys(page)).toBeNull();

    await page.close();
  });

  test('OPT-A10: CSV エクスポートができる（ブロックリスト・統計データ）', async ({
    context,
    extensionId
  }) => {
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
    await setStorageData(
      setupPage,
      'sites',
      makeSites([{ domain: 'reddit.com', block: {} }])
    );
    await setStorageData(
      setupPage,
      'activity',
      makeActivity([['reddit.com', { seconds: 600, blocks: 3 }]])
    );
    await setupPage.close();

    const page = await openOptions(context, extensionId, 'analytics');

    const exportButton = page.locator(SELECTORS.analytics.exportButton);
    await expect(exportButton).toBeVisible();

    await exportButton.click();

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

    await expect(weeklyTab).toHaveAttribute('aria-selected', 'true');
    await expect(previousWeek).toBeVisible();
    await expect(previousMonth).toHaveCount(0);

    await expect(nextWeek).toBeDisabled();
    await previousWeek.click();
    await expect(nextWeek).toBeEnabled();

    await monthlyTab.click();
    await expect(monthlyTab).toHaveAttribute('aria-selected', 'true');
    await expect(previousMonth).toBeVisible();
    await expect(previousWeek).toHaveCount(0);

    await weeklyTab.click();
    await expect(nextWeek).toBeEnabled();

    await page.close();
  });
});
