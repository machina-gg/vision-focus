import { test, expect } from './fixtures/extension';
import { openPopup } from './helpers/pages';
import { getWindowFocusStateViaSW } from './helpers/sw';

/**
 * 実測のみを行う探針テスト（machina-gg/vision-focus#463 の 1 段目）
 *
 * E2E の実行環境（`xvfb-run` の仮想ディスプレイ上で 3 並列）で、ブラウザの
 * ウィンドウが「前面」と判定されるかは Sandbox から測れない。このテストは
 * `chrome.windows.getLastFocused()` / `chrome.windows.getAll()` を読むだけで、
 * `chrome.windows.update` 等の前面化は行わない（他の並列テストのウィンドウ
 * 状態に影響させないため）。
 */
test('PROBE-001: E2E 環境でブラウザのウィンドウが前面と判定されるか（実測のみ）', async ({
  context,
  extensionId
}) => {
  // 拡張機能のページを 1 つ開いた状態で読む（未使用でもフォーカス状態に
  // 影響しうるため、他のテストと同じ前提を揃える）
  await openPopup(context, extensionId);

  const result = await getWindowFocusStateViaSW(context);

  // annotation はレポート（HTML）、console.log は workflow のログで読める
  test.info().annotations.push({
    type: 'focus-probe',
    description: JSON.stringify(result)
  });
  console.log('[focus-probe]', JSON.stringify(result));

  // このテストは「観測できること」だけを検査する。`focused` の真偽は
  // 実測対象そのものであり、ここで真偽を決めつけて落とさない
  expect(result.lastFocused).toBeDefined();
});
