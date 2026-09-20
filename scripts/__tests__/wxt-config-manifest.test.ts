import { describe, expect, it } from 'vitest';

import config from '../../wxt.config';

/**
 * manifest の web_accessible_resources に宣言されたリソースを平坦化する
 * （エントリは `{ resources, matches }` の配列）
 */
function webAccessibleResources(): string[] {
  const manifest = config.manifest;
  // 型上は関数・Promise も取りうる（WXT のブラウザ別 manifest）。
  // 本リポジトリは静的オブジェクトで書いており、そうでなくなったらここで落とす
  if (
    typeof manifest !== 'object' ||
    manifest === null ||
    manifest instanceof Promise
  ) {
    throw new Error('manifest が静的オブジェクトではない');
  }
  const entries = manifest.web_accessible_resources ?? [];
  return entries.flatMap((entry) =>
    typeof entry === 'object' && entry !== null && 'resources' in entry
      ? (entry.resources ?? [])
      : []
  );
}

describe('wxt.config.ts の web_accessible_resources', () => {
  it('newtab.html を公開する', () => {
    // declarativeNetRequest の redirect 先が web accessible でないと、
    // 他サイトからの遷移が ERR_BLOCKED_BY_CLIENT で止まり
    // ブロック画面に到達できない（machina-gg/vision-focus#351）
    expect(webAccessibleResources()).toContain('newtab.html');
  });

  it('背景画像を公開する', () => {
    expect(webAccessibleResources()).toContain('assets/images/backgrounds/*');
  });
});
