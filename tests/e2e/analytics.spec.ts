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
  setSitesFromExtension,
  getStorageData,
  makeActivity,
  makeAppSettings,
  makeSites,
  readSiteSetting
} from './helpers/storage';
import {
  getStorageViaSW,
  getTodayActivityViaSW,
  setupStorageViaSW,
  triggerBlockRuleRecompute,
  waitForBlockRules
} from './helpers/sw';
import { TEST_DOMAINS, SELECTORS } from './helpers/constants';

/**
 * 保存済みの事実の表（activity）から、行のある日付の一覧を読む。
 *
 * ⚠ 読めなかったときに空の配列へフォールバックしない。フォールバックすると
 * キー名を間違えたままでも「0 件」を返し、リセットの検査が素通りする（#411）。
 * 消えている（未保存）ことが分かる null を返し、呼び出し側のアサーションで見分ける。
 */
async function readActivityDates(page: Page): Promise<string[] | null> {
  const log = await getStorageData(page, 'activity');
  return log ? Object.keys(log) : null;
}

/**
 * E2E Tests: アナリティクス機能
 *
 * ブロック回数・解除・滞在時間の記録（事実の表 activity）、リセット、Opt-In/Opt-Out をテスト
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
      analyticsOptIn: { enabled: true, decidedAt: new Date().toISOString() }
    });
    await setSitesFromExtension(context, extensionId, [
      { domain: TEST_DOMAINS.example, block: {} }
    ]);

    await waitForBlockRules(context, [TEST_DOMAINS.example]);

    // 記録は background が非同期に書く。読み出しは SW 経由で行い、
    // この値を増やす経路（ブロックされたナビゲーション）だけを待つ
    const todayBlocks = async () =>
      (await getTodayActivityViaSW(context, TEST_DOMAINS.example))?.blocks ?? 0;

    // ブロック対象サイトに3回アクセス
    for (let i = 0; i < 3; i++) {
      const blockedPage = await openExternalSite(
        context,
        `https://${TEST_DOMAINS.example}`
      );
      await blockedPage.waitForURL(`**newtab.html**`, { timeout: 10000 });
      await expect.poll(todayBlocks).toBeGreaterThanOrEqual(i + 1);
      await blockedPage.close();
    }

    // サイト別の回数は事実の表の今日の行（サイトキーごとの blocks）に入る
    expect(await todayBlocks()).toBeGreaterThanOrEqual(3);
  });

  test('AN-002: ブロックリストから外したサイトは追跡中に残る', async ({
    context,
    extensionId
  }) => {
    await setSettingsFromExtension(context, extensionId, {
      paused: false,
      analyticsOptIn: { enabled: true, decidedAt: new Date().toISOString() }
    });
    await setSitesFromExtension(context, extensionId, [
      { domain: TEST_DOMAINS.example, block: {} }
    ]);

    const optionsPage = await openOptions(context, extensionId, 'blocklist');

    // ブロックリストから削除する = ブロック解除。既定の 5 秒の長押しで確定する
    await optionsPage.locator(SELECTORS.options.deleteButton).first().click();
    await expect(
      optionsPage.locator(SELECTORS.modal.unblockConfirm)
    ).toBeVisible();
    await holdUnblockConfirm(optionsPage);
    await expect(optionsPage.locator(SELECTORS.options.listItem)).toHaveCount(
      0
    );

    // 解除したサイトはブロック設定だけが外れ、追跡中のサイトに残る
    await expect
      .poll(async () => {
        const sites = await getStorageData(optionsPage, 'sites');
        const site = sites?.[TEST_DOMAINS.example];
        return site ? { tracked: true, block: site.block } : null;
      })
      .toEqual({ tracked: true, block: null });

    await optionsPage.close();
  });

  test('AN-003: 解除サイトの滞在時間が Heartbeat で記録される', async ({
    context
  }) => {
    // 記録は background の一定間隔のタイマーが 1 周してから入るため、
    // 既定のテスト時間では足りない
    test.setTimeout(90_000);

    // 記録されるのは追跡中のサイト（sites）だけ。ここでは追跡だけのサイトにする
    await setupStorageViaSW(context, {
      settings: makeAppSettings({
        paused: false,
        analyticsOptIn: { enabled: true, decidedAt: new Date().toISOString() }
      }),
      sites: makeSites([{ domain: TEST_DOMAINS.example }])
    });

    const externalPage = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.example}`
    );

    await externalPage.waitForLoadState('domcontentloaded');

    // 滞在秒数を書くのは heartbeat（表示中のページ）の経路だけ。
    // 読み出しは SW 経由で行う（拡張機能のページを開くと前面のタブが
    // 入れ替わり、コンテンツスクリプトの heartbeat が止まる）
    await expect
      .poll(
        async () =>
          (await getTodayActivityViaSW(context, TEST_DOMAINS.example))
            ?.seconds ?? 0,
        { timeout: 60_000 }
      )
      .toBeGreaterThan(0);

    await externalPage.close();
  });

  test('AN-004: 追跡中サイトのサブドメインで見ている時間はサイトの行に記録される', async ({
    context
  }) => {
    test.setTimeout(90_000);

    await setupStorageViaSW(context, {
      settings: makeAppSettings({
        paused: false,
        analyticsOptIn: { enabled: true, decidedAt: new Date().toISOString() }
      }),
      sites: makeSites([{ domain: TEST_DOMAINS.example }])
    });

    // ホスト名は www. 付き。記録はホスト名ではなく追跡中のサイトキーに引き直される
    const externalPage = await openExternalSite(
      context,
      `https://www.${TEST_DOMAINS.example}`
    );
    await externalPage.waitForLoadState('domcontentloaded');

    await expect
      .poll(
        async () =>
          (await getTodayActivityViaSW(context, TEST_DOMAINS.example))
            ?.seconds ?? 0,
        { timeout: 60_000 }
      )
      .toBeGreaterThan(0);

    // ホスト名の行は作らない（作ると同じサイトの時間が 2 行に分かれる）
    expect(
      await getTodayActivityViaSW(context, `www.${TEST_DOMAINS.example}`)
    ).toBeNull();

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
      settings: makeAppSettings({
        paused: false,
        // Opt-Out 状態
        analyticsOptIn: { enabled: false, decidedAt: new Date().toISOString() }
      }),
      sites: makeSites([{ domain: TEST_DOMAINS.example, block: {} }])
    });
    await triggerBlockRuleRecompute(context);
    await waitForBlockRules(context, [TEST_DOMAINS.example]);

    // ブロック対象サイトにアクセスするとブロックページへ飛ぶ
    const blockedPage = await openExternalSite(
      context,
      `https://${TEST_DOMAINS.example}`
    );
    await blockedPage.waitForURL(`**newtab.html**`, { timeout: 10000 });

    // Opt-Out でもブロック回数は事実の表に記録される
    await expect
      .poll(
        async () =>
          (await getTodayActivityViaSW(context, TEST_DOMAINS.example))
            ?.blocks ?? 0
      )
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

    // 事実の表を今日と過去の日に用意する。リセットは今日の分も含めて全部消す
    await setStorageDataFromExtension(
      context,
      extensionId,
      'activity',
      makeActivity([
        [TEST_DOMAINS.reddit, { seconds: 300, blocks: 10 }, 0],
        [TEST_DOMAINS.reddit, { blocks: 5, unblocks: 1 }, 30]
      ])
    );

    // 追跡中のサイトの一覧はリセットしても残る
    await setSitesFromExtension(context, extensionId, [
      { domain: TEST_DOMAINS.reddit }
    ]);

    // Options ページを開く
    const optionsPage = await openOptions(context, extensionId, 'analytics');

    // リセット前に事実が入っていることを確かめる。
    // 空の状態から空を見ても「リセットされた」ことにはならない（#411）
    expect(await readActivityDates(optionsPage)).toHaveLength(2);

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

    // 事実の表が今日の分も含めて消える。消すのは background なので反映を待つ
    await expect.poll(() => readActivityDates(optionsPage)).toBeNull();

    // 追跡中のサイトの一覧は残る
    await expect
      .poll(async () =>
        Object.keys((await getStorageData(optionsPage, 'sites')) ?? {})
      )
      .toEqual([TEST_DOMAINS.reddit]);

    await optionsPage.close();
  });

  // AN-008 / AN-009（オフライン時の Heartbeat キューイング）は削除した。
  // 実装に heartbeatQueue に相当する仕組みが存在せず、テストは存在しない
  // 機能を検証していた。AN-008 は `if (queueData)` で囲まれていたため
  // 常に緑になっていた。キューイングを実装する場合はテストも作り直す。

  // `remove-block` ハンドラ（src/background/handlers/remove-block.ts）は
  // analyticsOptIn を一切参照せず、追跡を続けて解除を無条件で記録する。
  // Opt-Out が止めるのは GA4 への外部送信だけなので、追跡と解除の記録は残るのが正しい
  // （machina-gg/vision-focus#431 の判断）
  test('AN-010: Opt-Out でも解除したサイトの追跡と解除の記録は残る', async ({
    context,
    extensionId
  }) => {
    // Opt-Out 状態
    await setSettingsFromExtension(context, extensionId, {
      paused: false,
      analyticsOptIn: { enabled: false, decidedAt: new Date().toISOString() }
    });
    await setSitesFromExtension(context, extensionId, [
      { domain: TEST_DOMAINS.example, block: {} }
    ]);

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

    // 解除したサイトは追跡中に残る（書き込みは非同期なので反映を待つ）
    await expect
      .poll(() => readSiteSetting(optionsPage, TEST_DOMAINS.example, 'block'))
      .toBeNull();

    // 解除の回数も事実の表に残る
    await expect
      .poll(
        async () =>
          (await getTodayActivityViaSW(context, TEST_DOMAINS.example))
            ?.unblocks ?? 0
      )
      .toBe(1);

    await optionsPage.close();
  });
});
