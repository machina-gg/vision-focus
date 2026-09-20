import type { Page } from '@playwright/test';

import { test, expect } from './fixtures/extension';
import {
  openOptions,
  openExternalSite,
  holdUnblockConfirm
} from './helpers/pages';
import {
  clearStorageFromExtension,
  setStorageDataFromExtension,
  setSettingsFromExtension,
  getStorageDataFromExtension,
  getStorageData,
  makeAnalytics,
  makeSiteBlockCounts
} from './helpers/storage';
import { TEST_DOMAINS, SELECTORS } from './helpers/constants';

import type { AnalyticsData, UnblockHistory } from '~/types/storage';

/**
 * 保存済みの analytics から、集計の入っているキーの一覧を読む
 *
 * ⚠ 読めなかったときに空の配列へフォールバックしない。フォールバックすると
 * キー名を間違えたままでも「0 件」を返し、リセットの検査が素通りする（#411）。
 * 読めなかったことが分かる null を返し、呼び出し側のアサーションで落とす。
 */
async function readAnalyticsKeys(
  page: Page
): Promise<{ dailyStats: string[]; siteBlockCounts: string[] } | null> {
  const analytics = await getStorageData<AnalyticsData>(page, 'analytics');
  if (!analytics?.dailyStats || !analytics?.siteBlockCounts) {
    return null;
  }
  return {
    dailyStats: Object.keys(analytics.dailyStats),
    siteBlockCounts: Object.keys(analytics.siteBlockCounts)
  };
}

/** 保存済みの解除履歴から、ドメインごとの解除後の滞在時間を読む */
async function readTimeAfterUnblock(
  page: Page
): Promise<Record<string, number> | null> {
  const history = await getStorageData<UnblockHistory>(page, 'unblockHistory');
  if (!history?.sites) {
    return null;
  }
  return Object.fromEntries(
    Object.entries(history.sites).map(([domain, site]) => [
      domain,
      site.timeAfterUnblock
    ])
  );
}

/**
 * E2E Tests: アナリティクス機能
 *
 * サイト別ブロック回数、Unblock History、Heartbeat、Opt-In/Opt-Outをテスト
 */

test.describe('Analytics - アナリティクス機能', () => {
  test.beforeEach(async ({ context, extensionId }) => {
    await clearStorageFromExtension(context, extensionId);
  });

  test('AN-001: サイト別ブロック回数が記録される', async ({
    context,
    extensionId
  }) => {
    await setSettingsFromExtension(context, extensionId, {
      paused: false,
      analyticsOptIn: { enabled: true, decidedAt: new Date().toISOString() },
      blockList: [
        {
          id: '1',
          domain: TEST_DOMAINS.example,
          isWildcard: false,
          createdAt: new Date().toISOString(),
          enabled: true
        }
      ]
    });

    await setStorageDataFromExtension(context, extensionId, 'analytics', {
      dailyStats: {},
      siteStats: {}
    });

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // ブロック対象サイトに3回アクセス
    for (let i = 0; i < 3; i++) {
      const blockedPage = await openExternalSite(
        context,
        `https://${TEST_DOMAINS.example}`
      );
      await blockedPage.waitForURL(`**newtab.html**`, { timeout: 10000 });
      await blockedPage.close();
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    // Analytics データを確認
    const analytics = (await getStorageDataFromExtension(
      context,
      extensionId,
      'analytics'
    )) as any;

    // サイト別の回数は siteBlockCounts[domain].count に入る
    expect(analytics.siteBlockCounts[TEST_DOMAINS.example]).toBeDefined();
    expect(
      analytics.siteBlockCounts[TEST_DOMAINS.example].count
    ).toBeGreaterThanOrEqual(3);
  });

  test('AN-002: Unblock History（ブロック解除サイト）が記録される', async ({
    context,
    extensionId
  }) => {
    await setSettingsFromExtension(context, extensionId, {
      paused: false,
      analyticsOptIn: { enabled: true, decidedAt: new Date().toISOString() },
      blockList: [
        {
          id: '1',
          domain: TEST_DOMAINS.example,
          isWildcard: false,
          createdAt: new Date().toISOString(),
          enabled: true
        }
      ]
    });

    // 解除履歴はドメインをキーにした sites に入る
    await setStorageDataFromExtension(context, extensionId, 'unblockHistory', {
      sites: {}
    });

    const optionsPage = await openOptions(context, extensionId, 'blocklist');

    // ブロックリストから削除する = ブロック解除。5 秒の長押しで確定する
    await optionsPage.locator(SELECTORS.options.deleteButton).first().click();
    await expect(
      optionsPage.locator(SELECTORS.modal.unblockConfirm)
    ).toBeVisible();
    await holdUnblockConfirm(optionsPage);
    await expect(optionsPage.locator(SELECTORS.options.listItem)).toHaveCount(
      0
    );

    // 解除したドメインが履歴に記録される
    await expect
      .poll(async () => {
        const history = (await getStorageData(
          optionsPage,
          'unblockHistory'
        )) as {
          sites?: Record<string, unknown>;
        } | null;
        return Object.keys(history?.sites ?? {});
      })
      .toContain(TEST_DOMAINS.example);

    await optionsPage.close();
  });

  test('AN-003: 解除サイトの滞在時間が 30 秒間隔の Heartbeat で記録', async ({
    context,
    extensionId
  }) => {
    await setSettingsFromExtension(context, extensionId, {
      paused: false,
      analyticsOptIn: { enabled: true, decidedAt: new Date().toISOString() }
    });

    await setStorageDataFromExtension(context, extensionId, 'analytics', {
      dailyStats: {},
      siteStats: {}
    });

    // 解除サイトにアクセス（ブロックリストに含まれていないサイト）
    const externalPage = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.reddit}`
    );

    await externalPage.waitForLoadState('domcontentloaded');

    // 30秒間待機してHeartbeatが送信されるのを待つ（テストでは短縮）
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // トラッキングデータを確認
    const analytics = (await getStorageDataFromExtension(
      context,
      extensionId,
      'analytics'
    )) as any;

    // Heartbeatが記録されていることを確認（時間は短いが記録されている）
    if (analytics.siteStats[TEST_DOMAINS.reddit]) {
      expect(
        analytics.siteStats[TEST_DOMAINS.reddit].totalTime
      ).toBeGreaterThan(0);
    }

    await externalPage.close();
  });

  test('AN-004: トラッキング中サイトの滞在時間が記録される', async ({
    context,
    extensionId
  }) => {
    await setSettingsFromExtension(context, extensionId, {
      paused: false,
      analyticsOptIn: { enabled: true, decidedAt: new Date().toISOString() }
    });

    await setStorageDataFromExtension(context, extensionId, 'analytics', {
      dailyStats: {},
      siteStats: {}
    });

    // 外部サイトにアクセス
    const externalPage = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.example}`
    );

    await externalPage.waitForLoadState('domcontentloaded');
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Analytics データを確認
    const analytics = (await getStorageDataFromExtension(
      context,
      extensionId,
      'analytics'
    )) as any;

    // dailyStats に記録があることを確認
    const today = new Date().toISOString().slice(0, 10);
    if (analytics.dailyStats[today]) {
      expect(analytics.dailyStats[today]).toBeDefined();
    }

    await externalPage.close();
  });

  test('AN-005: Analytics Opt-In モーダルで許可/拒否を選択できる', async ({
    context,
    extensionId
  }) => {
    // Opt-In が未決定の状態
    await setSettingsFromExtension(context, extensionId, {
      paused: false,
      analyticsOptIn: null
    });

    // Options ページを開く
    const optionsPage = await openOptions(context, extensionId, 'analytics');

    // Opt-In モーダルが表示されることを確認
    const modal = optionsPage.locator('[role="dialog"], .modal');
    await modal.waitFor({ state: 'visible', timeout: 3000 });

    // 許可ボタンをクリック
    const allowButton = modal.locator(
      'button:has-text("Allow"), button:has-text("許可")'
    );
    await allowButton.click();

    // 設定が保存されたことを確認
    await new Promise((resolve) => setTimeout(resolve, 300));
    const settings = (await getStorageDataFromExtension(
      context,
      extensionId,
      'settings'
    )) as any;
    expect(settings.analyticsOptIn).toBeDefined();
    expect(settings.analyticsOptIn.enabled).toBe(true);

    await optionsPage.close();
  });

  test('AN-006: Opt-Out した場合、トラッキングが無効化される', async ({
    context,
    extensionId
  }) => {
    // Opt-Out 状態
    await setSettingsFromExtension(context, extensionId, {
      paused: false,
      analyticsOptIn: { enabled: false, decidedAt: new Date().toISOString() }
    });

    await setStorageDataFromExtension(context, extensionId, 'analytics', {
      dailyStats: {},
      siteStats: {}
    });

    // 外部サイトにアクセス
    const externalPage = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.example}`
    );

    await externalPage.waitForLoadState('domcontentloaded');
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Analytics データが記録されていないことを確認
    const analytics = (await getStorageDataFromExtension(
      context,
      extensionId,
      'analytics'
    )) as any;
    expect(Object.keys(analytics.dailyStats).length).toBe(0);

    await externalPage.close();
  });

  test('AN-007: Analytics データをリセットできる', async ({
    context,
    extensionId
  }) => {
    await setSettingsFromExtension(context, extensionId, {
      paused: false,
      analyticsOptIn: { enabled: true, decidedAt: new Date().toISOString() }
    });

    // Analytics データを設定（保存形は AnalyticsData。集計はドメインをキーに持つ）
    await setStorageDataFromExtension(
      context,
      extensionId,
      'analytics',
      makeAnalytics({
        dailyStats: {
          '2024-01-01': {
            date: '2024-01-01',
            wasteTime: 300,
            investTime: 0,
            blockCount: 10,
            unblockCount: 0
          }
        },
        siteBlockCounts: makeSiteBlockCounts([[TEST_DOMAINS.example, 5]])
      })
    );

    // 解除履歴も用意する。リセットは「一覧は残したまま滞在時間だけ 0 にする」
    // （src/hooks/useAnalytics.ts の handleResetAnalytics）
    await setStorageDataFromExtension(context, extensionId, 'unblockHistory', {
      sites: {
        [TEST_DOMAINS.reddit]: {
          domain: TEST_DOMAINS.reddit,
          status: 'unblocked',
          blockedAt: '2024-01-01T00:00:00.000Z',
          unblockedAt: '2024-01-02T00:00:00.000Z',
          timeAfterUnblock: 1200,
          lastActivity: '2024-01-02T01:00:00.000Z'
        }
      }
    });

    // Options ページを開く
    const optionsPage = await openOptions(context, extensionId, 'analytics');

    // リセット前に集計が入っていることを確かめる。
    // 空の状態から空を見ても「リセットされた」ことにはならない（#411）
    const before = await readAnalyticsKeys(optionsPage);
    expect(before?.dailyStats).toEqual(expect.arrayContaining(['2024-01-01']));
    expect(before?.siteBlockCounts).toEqual(
      expect.arrayContaining([TEST_DOMAINS.example])
    );

    // リセットボタンをクリックすると確認モーダルが開く
    const resetButton = optionsPage.locator(SELECTORS.analytics.resetButton);
    await expect(resetButton).toBeVisible();
    await resetButton.click();

    // 確認モーダルの実行ボタンを押すまでリセットは走らない
    // （window.confirm ではなくアプリ内のモーダル。
    //   src/components/options/analytics/AnalyticsExportBar.tsx）
    const resetConfirmButton = optionsPage.locator(
      SELECTORS.analytics.resetConfirmButton
    );
    await expect(resetConfirmButton).toBeVisible();
    await resetConfirmButton.click();

    // 保存済みの集計が空になる。書き込みは非同期なので反映されるまで待つ
    await expect
      .poll(() => readAnalyticsKeys(optionsPage))
      .toEqual({
        dailyStats: [],
        siteBlockCounts: []
      });

    // 解除履歴はドメインの一覧を残したまま、滞在時間だけ 0 になる
    await expect
      .poll(() => readTimeAfterUnblock(optionsPage))
      .toEqual({ [TEST_DOMAINS.reddit]: 0 });

    await optionsPage.close();
  });

  // AN-008 / AN-009（オフライン時の Heartbeat キューイング）は削除した。
  // 実装に heartbeatQueue に相当する仕組みが存在せず、テストは存在しない
  // 機能を検証していた。AN-008 は `if (queueData)` で囲まれていたため
  // 常に緑になっていた。キューイングを実装する場合はテストも作り直す。

  // ⚠ AN-010 は実行しない（fixme）。
  // 題目どおりの操作（Options のブロックリストから解除する）に書き直したが、
  // 期待結果が実装と食い違っているため今は必ず落ちる。
  // `remove-block` ハンドラ（src/background/handlers/remove-block.ts）は
  // analyticsOptIn を一切参照せず、解除履歴を無条件で記録する。Opt-Out が
  // 止めるのは GA4 への外部送信だけ（src/lib/analytics.ts の isAnalyticsEnabled）。
  // テスト名を実装に合わせるのか実装を変えるのかは未決（machina-gg/vision-focus#431
  // 「先に判断が要るもの」2）。決まるまで、緑に見せずに未実行として残す。
  test.fixme('AN-010: Opt-Out 時に Unblock History も無効化される', async ({
    context,
    extensionId
  }) => {
    // Opt-Out 状態
    await setSettingsFromExtension(context, extensionId, {
      paused: false,
      analyticsOptIn: { enabled: false, decidedAt: new Date().toISOString() },
      blockList: [
        {
          id: '1',
          domain: TEST_DOMAINS.example,
          isWildcard: false,
          createdAt: new Date().toISOString(),
          enabled: true
        }
      ]
    });

    // 解除履歴はドメインをキーにした sites に入る（entries という配列は無い）
    await setStorageDataFromExtension(context, extensionId, 'unblockHistory', {
      sites: {}
    });

    // Options ページでブロック解除する。
    // 解除ボタンは文言を持たず Trash2 アイコンだけなので testid で指す
    const optionsPage = await openOptions(context, extensionId, 'blocklist');

    await optionsPage.locator(SELECTORS.options.deleteButton).first().click();
    await expect(
      optionsPage.locator(SELECTORS.modal.unblockConfirm)
    ).toBeVisible();
    await holdUnblockConfirm(optionsPage);
    await expect(optionsPage.locator(SELECTORS.options.listItem)).toHaveCount(
      0
    );

    // Unblock History に記録されないことを確認
    const history = await getStorageData<UnblockHistory>(
      optionsPage,
      'unblockHistory'
    );
    expect(Object.keys(history?.sites ?? {})).toEqual([]);

    await optionsPage.close();
  });
});
