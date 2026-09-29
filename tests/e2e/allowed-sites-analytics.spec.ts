import { test, expect } from './fixtures/extension';
import {
  openOptions,
  openPopup,
  clearStorage,
  setupTestStorage,
  setStorageData,
  makeActivity,
  makeSites,
  SELECTORS
} from './helpers';

import { formatTime } from '~/lib/time';

const BLOCKED = 'youtube.com';
const ALLOWED = `music.${BLOCKED}`;
const NOT_RECORDED = `studio.${BLOCKED}`;
const TRACKING = 'reddit.com';
const DISABLED = 'x.com';

const BLOCKED_SECONDS = 600;
const TRACKING_SECONDS = 1200;
const DISABLED_SECONDS = 600;
const ALLOWED_SECONDS = 3600;
const WASTE_SECONDS = BLOCKED_SECONDS + TRACKING_SECONDS + DISABLED_SECONDS;
const LIST_TOTAL_SECONDS = TRACKING_SECONDS + DISABLED_SECONDS;

test.describe('Allow - 許可サイトの集計', () => {
  test.beforeEach(async ({ context, extensionId }) => {
    const page = await openOptions(context, extensionId);
    await clearStorage(page);
    await setupTestStorage(page, {
      withGoal: true,
      withAnalyticsOptIn: true
    });
    await setStorageData(
      page,
      'sites',
      makeSites([
        { domain: BLOCKED, block: {} },
        { domain: TRACKING },
        { domain: DISABLED, block: { enabled: false } },
        { domain: ALLOWED, allow: { recordTime: true } },
        { domain: NOT_RECORDED, allow: { recordTime: false } }
      ])
    );
    // 許可サイトの行にブロック回数を置き、母集団に混ざればランキングと今日のブロック数の 1 位になるようにする
    await setStorageData(
      page,
      'activity',
      makeActivity([
        [BLOCKED, { seconds: BLOCKED_SECONDS, blocks: 3 }],
        [TRACKING, { seconds: TRACKING_SECONDS, unblocks: 1 }],
        [DISABLED, { seconds: DISABLED_SECONDS, unblocks: 1 }],
        [ALLOWED, { seconds: ALLOWED_SECONDS, blocks: 50 }]
      ])
    );
    await page.close();
  });

  test('ALLOW-011: 許可サイトの時間は別のグラフに出て、浪費のグラフ・ランキング・ポップアップ・一覧の合計に入らない', async ({
    context,
    extensionId
  }) => {
    const popup = await openPopup(context, extensionId);
    await expect(popup.locator(SELECTORS.summary.blockCount)).toHaveText('3');
    await expect(
      popup.locator(SELECTORS.summary.topBlockedSiteDomain)
    ).toHaveText(BLOCKED);
    // 浪費は 40 分。許可サイトが混ざると 1 時間 40 分になる
    await expect(popup.locator(SELECTORS.summary.wastedTime)).toHaveText(
      /^40\s?(分|min)$/
    );
    await popup.close();

    const page = await openOptions(context, extensionId, 'analytics');

    const wasteTotal = page.locator(
      `${SELECTORS.analytics.chartTotal}[data-variant="waste"]`
    );
    await expect(wasteTotal).toContainText(formatTime(WASTE_SECONDS));

    const allowedChart = page.locator(SELECTORS.analytics.allowedChart);
    await expect(allowedChart).toBeVisible();
    await expect(
      allowedChart.locator(
        `${SELECTORS.analytics.chartTotal}[data-variant="allowed"]`
      )
    ).toContainText(formatTime(ALLOWED_SECONDS));

    const ranking = page
      .locator(SELECTORS.analytics.siteRankingList)
      .locator('xpath=..');
    await expect(ranking).toContainText(BLOCKED);
    await expect(ranking).not.toContainText(ALLOWED);

    const rows = page.locator(SELECTORS.analytics.trackedSite);
    await expect(rows).toHaveCount(5);
    const allowedRows = page.locator(
      `${SELECTORS.analytics.trackedSite}[data-status="allowed"]`
    );
    await expect(allowedRows).toHaveCount(2);
    await expect(rows.nth(3)).toHaveAttribute('data-status', 'allowed');
    await expect(rows.nth(4)).toHaveAttribute('data-status', 'allowed');
    await expect(
      allowedRows.locator(SELECTORS.analytics.reblockButton)
    ).toHaveCount(0);
    await expect(
      allowedRows.locator(SELECTORS.analytics.stopTrackingButton)
    ).toHaveCount(0);

    const recordedRow = allowedRows.filter({ hasText: ALLOWED });
    await expect(
      recordedRow.locator(SELECTORS.analytics.trackedSiteTime)
    ).toHaveText(formatTime(ALLOWED_SECONDS));
    const notRecordedRow = allowedRows.filter({ hasText: NOT_RECORDED });
    await expect(
      notRecordedRow.locator(SELECTORS.analytics.trackedSiteNotRecording)
    ).toBeVisible();
    await expect(
      notRecordedRow.locator(SELECTORS.analytics.trackedSiteTime)
    ).toHaveCount(0);

    await expect(
      page.locator(SELECTORS.analytics.trackedSitesTotal)
    ).toHaveText(formatTime(LIST_TOTAL_SECONDS));

    await page.close();
  });
});
