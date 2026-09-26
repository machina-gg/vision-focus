import { describe, expect, it } from 'vitest';

import config from '../../wxt.config';

function webAccessibleResources(): string[] {
  const manifest = config.manifest;
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
    // redirect 先が web accessible でないと ERR_BLOCKED_BY_CLIENT で止まり、ブロック画面に到達できない
    expect(webAccessibleResources()).toContain('newtab.html');
  });

  it('背景画像を公開する', () => {
    expect(webAccessibleResources()).toContain('assets/images/backgrounds/*');
  });
});
