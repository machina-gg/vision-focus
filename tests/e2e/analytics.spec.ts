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
  makeSettings,
  makeSiteBlockCounts,
  makeUnblockHistory
} from './helpers/storage';
import {
  getStorageViaSW,
  setupStorageViaSW,
  triggerBlockRuleRecompute,
  waitForBlockRules
} from './helpers/sw';
import { TEST_DOMAINS, SELECTORS } from './helpers/constants';

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
  const analytics = await getStorageData(page, 'analytics');
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
  const history = await getStorageData(page, 'unblockHistory');
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

    await setStorageDataFromExtension(
      context,
      extensionId,
      'analytics',
      makeAnalytics()
    );

    await waitForBlockRules(context, [TEST_DOMAINS.example]);

    // 記録は background が非同期に書く。読み出しは SW 経由で行い、
    // この値を増やす経路（ブロックされたナビゲーション）だけを待つ
    const siteBlockCount = async () => {
      const analytics = await getStorageViaSW(context, 'analytics');
      return analytics?.siteBlockCounts[TEST_DOMAINS.example]?.count ?? 0;
    };

    // ブロック対象サイトに3回アクセス。
    // ⚠ 1 回ごとに記録を待つ。記録は読み出してから書き戻すため、
    //    重なると片方の加算が消える
    for (let i = 0; i < 3; i++) {
      const blockedPage = await openExternalSite(
        context,
        `https://${TEST_DOMAINS.example}`
      );
      await blockedPage.waitForURL(`**newtab.html**`, { timeout: 10000 });
      await expect.poll(siteBlockCount).toBeGreaterThanOrEqual(i + 1);
      await blockedPage.close();
    }

    // サイト別の回数は siteBlockCounts[domain].count に入る
    expect(await siteBlockCount()).toBeGreaterThanOrEqual(3);
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

  test('AN-003: 解除サイトの滞在時間が Heartbeat で記録される', async ({
    context
  }) => {
    // 記録は background の一定間隔のタイマーが 1 周してから入るため、
    // 既定のテスト時間では足りない
    test.setTimeout(90_000);

    // ⚠ 計測されるのは「解除履歴に載っているドメイン」だけ。履歴に無いと
    // recordTime が途中で return するので、キー名が正しくても何も記録されない
    // （src/background/handlers/tracker-heartbeat.ts の findUnblockedSite）
    await setupStorageViaSW(context, {
      settings: makeSettings({
        paused: false,
        analyticsOptIn: { enabled: true, decidedAt: new Date().toISOString() }
      }),
      analytics: makeAnalytics(),
      unblockHistory: makeUnblockHistory([TEST_DOMAINS.example])
    });

    const externalPage = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.example}`
    );

    await externalPage.waitForLoadState('domcontentloaded');

    // ⚠ 待つ対象は timeAfterUnblock にする。`analytics.siteTime` を書く経路は
    // 2 つあり（heartbeat 側の recordTime と、アクティブタブを 1 秒ごとに
    // 記録する src/background/tracker.ts の recordTime）、後者は解除履歴と
    // 無関係にどのサイトでも動く。siteTime で待つと 1〜2 秒で満たされて
    // 先へ進み、heartbeat のタイマーが 1 周する前に読んでしまう
    // （run 35523350131 で 3.1 秒で 0 を読んで失敗）。
    // timeAfterUnblock を増やすのは heartbeat 側の recordTime だけ。
    // 読み出しは SW 経由で行う（拡張機能のページを開くと前面のタブが
    // 入れ替わり、コンテンツスクリプトの heartbeat が止まる）
    await expect
      .poll(
        async () => {
          const history = await getStorageViaSW(context, 'unblockHistory');
          return history?.sites?.[TEST_DOMAINS.example]?.timeAfterUnblock ?? 0;
        },
        { timeout: 60_000 }
      )
      .toBeGreaterThan(0);

    // 滞在時間は analytics.siteTime にも入る（キー名が siteStats のままなら
    // ここで undefined になる）。⚠ この値は上記 2 経路のどちらでも増えるため、
    // heartbeat が動いたことの根拠は timeAfterUnblock の方である
    const analytics = await getStorageViaSW(context, 'analytics');
    expect(analytics?.siteTime?.[TEST_DOMAINS.example]?.time).toBeGreaterThan(
      0
    );

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

    await setStorageDataFromExtension(
      context,
      extensionId,
      'analytics',
      makeAnalytics()
    );

    // 外部サイトにアクセス
    const externalPage = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.example}`
    );

    await externalPage.waitForLoadState('domcontentloaded');

    // ⚠ この固定待機は残している。このテストは記録の経路を通っておらず、
    //    待ち先にできる「狙った経路だけが書く値」が無いため。
    //    tracker-heartbeat は解除履歴に載っているドメインだけを計測するので
    //    （src/background/handlers/tracker-heartbeat.ts）、この前提では
    //    何秒待っても dailyStats には何も入らない。下の判定も if で
    //    囲まれており、実質的に何も検査していない。
    //    同じ観点は AN-003 と INT-005 が実際の経路を通して検証している。
    //    本テストを書き直すか削除するかは仕様の判断が要るため #441 で報告する
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Analytics データを確認
    const analytics = await getStorageDataFromExtension(
      context,
      extensionId,
      'analytics'
    );

    // dailyStats に記録があることを確認
    const today = new Date().toISOString().slice(0, 10);
    if (analytics?.dailyStats[today]) {
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

    // 設定が保存されたことを確認する。
    // analyticsOptIn を enabled: true にするのは、このモーダルの許可だけ
    await expect
      .poll(async () => {
        const settings = await getStorageViaSW(context, 'settings');
        return settings?.analyticsOptIn?.enabled ?? null;
      })
      .toBe(true);

    await optionsPage.close();
  });

  // ⚠ analyticsOptIn が止めるのは GA4 への送信だけで、手元の集計は続く
  // （src/lib/analytics.ts の isAnalyticsEnabled が塞ぐのは trackEvent /
  //  sendDailyActive のみ。ブロック回数の記録は
  //  src/background/listeners/navigationTracking.ts が無条件に行う）。
  // machina-gg/vision-focus#431 でテストを実装に合わせると決めた
  test('AN-006: Opt-Out でもブロック回数の集計は続く', async ({ context }) => {
    await setupStorageViaSW(context, {
      settings: makeSettings({
        paused: false,
        // Opt-Out 状態
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
      }),
      analytics: makeAnalytics()
    });
    await triggerBlockRuleRecompute(context);
    await waitForBlockRules(context, [TEST_DOMAINS.example]);

    // ブロック対象サイトにアクセスするとブロックページへ飛ぶ
    const blockedPage = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.example}`
    );
    await blockedPage.waitForURL(`**newtab.html**`, { timeout: 10000 });

    // Opt-Out でもサイト別ブロック回数と日次統計は記録される
    const today = new Date().toISOString().slice(0, 10);
    await expect
      .poll(async () => {
        const analytics = await getStorageViaSW(context, 'analytics');
        return analytics?.siteBlockCounts?.[TEST_DOMAINS.example]?.count ?? 0;
      })
      .toBeGreaterThan(0);
    await expect
      .poll(async () => {
        const analytics = await getStorageViaSW(context, 'analytics');
        return analytics?.dailyStats?.[today]?.blockCount ?? 0;
      })
      .toBeGreaterThan(0);

    await blockedPage.close();
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

  // `remove-block` ハンドラ（src/background/handlers/remove-block.ts）は
  // analyticsOptIn を一切参照せず、解除履歴を無条件で記録する。
  // Opt-Out が止めるのは GA4 への外部送信だけなので、解除履歴は残るのが正しい
  // （machina-gg/vision-focus#431 の判断）
  test('AN-010: Opt-Out でも解除履歴は記録される', async ({
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

    // 解除したドメインが履歴に残る（書き込みは非同期なので反映を待つ）
    await expect
      .poll(async () => {
        const history = await getStorageData(optionsPage, 'unblockHistory');
        return Object.keys(history?.sites ?? {});
      })
      .toEqual([TEST_DOMAINS.example]);

    await optionsPage.close();
  });
});
