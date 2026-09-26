import { describe, it, expect } from 'vitest';

import { DEFAULT_TAB, TABS, getTabFromHash, isValidTab } from '../tabs';

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
