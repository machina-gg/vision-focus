import { describe, it, expect } from 'vitest';

import {
  DEFAULT_TAB,
  TABS,
  TAB_ORDER,
  getTabFromHash,
  isValidTab
} from '../tabs';

/**
 * 設定画面のタブ定数と URL ハッシュの解釈の検査
 *
 * ポップアップなど画面の外から `options.html#<タブ>` で開くため、
 * ハッシュの値がタブ名として通ること・未知の値は既定のタブに落ちることを確かめる。
 */

describe('TAB_ORDER', () => {
  it('ブロックリスト / スタイル / スケジュール / 分析 / 設定 / ヘルプの順に並ぶ', () => {
    expect(TAB_ORDER).toEqual([
      TABS.BLOCKLIST,
      TABS.STYLES,
      TABS.SCHEDULES,
      TABS.ANALYTICS,
      TABS.SETTINGS,
      TABS.HELP
    ]);
  });

  it('定義したタブをすべて含む', () => {
    expect([...TAB_ORDER].sort()).toEqual(Object.values(TABS).sort());
  });
});

describe('isValidTab', () => {
  it('設定タブの名前を受け付ける', () => {
    expect(isValidTab('settings')).toBe(true);
  });

  it('未知の名前は受け付けない', () => {
    expect(isValidTab('unknown')).toBe(false);
  });
});

describe('getTabFromHash', () => {
  it('#settings を設定タブとして解釈する', () => {
    expect(getTabFromHash('#settings')).toBe(TABS.SETTINGS);
  });

  it('#help をヘルプタブとして解釈する', () => {
    expect(getTabFromHash('#help')).toBe(TABS.HELP);
  });

  it('未知のハッシュは既定のタブに落ちる', () => {
    expect(getTabFromHash('#unknown')).toBe(DEFAULT_TAB);
  });

  it('ハッシュが空なら既定のタブに落ちる', () => {
    expect(getTabFromHash('')).toBe(DEFAULT_TAB);
  });
});
