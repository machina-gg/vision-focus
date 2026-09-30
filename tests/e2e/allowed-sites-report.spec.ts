import { test, expect } from './fixtures/extension';
import {
  openOptions,
  clearStorage,
  setupTestStorage,
  setStorageData,
  makeActivity,
  makeSites,
  SELECTORS,
  UI_TEXT
} from './helpers';

import { formatTime } from '~/lib/time';

const BLOCKED = 'youtube.com';
const ALLOWED = `music.${BLOCKED}`;

const BLOCKED_SECONDS = 600;
const ALLOWED_SECONDS = 3600;

test.describe('Allow - 許可サイトのレポート', () => {
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
        { domain: ALLOWED, allow: { recordTime: true } }
      ])
    );
    // 今日の行だけを置く（今日は必ず今週・今月に入るので、週・月の境界で結果が変わらない）
    await setStorageData(
      page,
      'activity',
      makeActivity([
        [BLOCKED, { seconds: BLOCKED_SECONDS }],
        [ALLOWED, { seconds: ALLOWED_SECONDS }]
      ])
    );
    await page.close();
  });

  test('ALLOW-012: 週次・月次レポートに補助の 1 行が出て、浪費時間には入らない', async ({
    context,
    extensionId
  }) => {
    const page = await openOptions(context, extensionId, 'analytics');

    const wasteTime = page.locator(SELECTORS.analytics.reportWasteTime);
    const allowedTime = page.locator(SELECTORS.analytics.reportAllowedTime);
    // 浪費は 10m。許可サイトが混ざると 1h 10m になる
    const expectedWaste = formatTime(BLOCKED_SECONDS);
    const expectedAllowed = `${UI_TEXT.reports.allowedTime}: ${formatTime(ALLOWED_SECONDS)}`;

    await expect(
      page.locator(SELECTORS.analytics.weeklyReportTab)
    ).toHaveAttribute('aria-selected', 'true');
    await expect(wasteTime).toHaveText(expectedWaste);
    await expect(allowedTime).toHaveText(expectedAllowed);

    const monthlyTab = page.locator(SELECTORS.analytics.monthlyReportTab);
    await monthlyTab.click();
    await expect(monthlyTab).toHaveAttribute('aria-selected', 'true');
    await expect(wasteTime).toHaveText(expectedWaste);
    await expect(allowedTime).toHaveText(expectedAllowed);

    await page.close();
  });
});
