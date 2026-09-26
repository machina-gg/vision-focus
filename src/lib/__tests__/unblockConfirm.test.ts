import { describe, it, expect } from 'vitest';

import { getUnblockHoldSeconds } from '../unblockConfirm';
import { DEFAULT_SETTINGS, type AppSettings } from '~/types/storage';

/**
 * 保存データから長押しの秒数を取り出す検査
 *
 * 項目を持たない保存データ（項目の追加前から使っている人）や壊れた値でも、
 * 長押し確認が既定の秒数で動き続けることを確かめる。ここが崩れると
 * 0 秒で解除できる・永久に解除できない、のどちらかが起きうる。
 */
describe('getUnblockHoldSeconds', () => {
  it('保存済みの秒数を返す', () => {
    const settings: AppSettings = {
      ...DEFAULT_SETTINGS,
      unblockConfirm: { holdSeconds: 60 }
    };

    expect(getUnblockHoldSeconds(settings)).toBe(60);
  });

  it('設定が未読み込みなら既定の 5 秒を返す', () => {
    expect(getUnblockHoldSeconds(undefined)).toBe(5);
  });

  it('項目を持たない保存データでは既定の 5 秒を返す', () => {
    const { unblockConfirm: _omitted, ...legacy } = DEFAULT_SETTINGS;

    expect(getUnblockHoldSeconds(legacy as unknown as AppSettings)).toBe(5);
  });

  it('選択肢に無い値が入っていれば既定の 5 秒を返す', () => {
    const broken = {
      ...DEFAULT_SETTINGS,
      unblockConfirm: { holdSeconds: 0 }
    } as unknown as AppSettings;

    expect(getUnblockHoldSeconds(broken)).toBe(5);
  });
});
