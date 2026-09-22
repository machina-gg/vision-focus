import { describe, expect, it } from 'vitest';

import { calculateBlockingDays } from '~/lib/blockingDays';
import type { BlockItem } from '~/types/storage';

const NOW = new Date('2024-06-15T00:00:00Z');

function makeBlockItem(
  overrides: Partial<BlockItem> & Pick<BlockItem, 'domain'>
): BlockItem {
  return {
    id: 'test-id',
    isWildcard: false,
    createdAt: '2024-06-01T00:00:00Z',
    enabled: true,
    ...overrides
  };
}

describe('calculateBlockingDays', () => {
  it('登録が無ければ null を返す', () => {
    expect(calculateBlockingDays('example.com', [], NOW)).toBeNull();
  });

  it('createdAt が無ければ null を返す', () => {
    const blockList = [
      makeBlockItem({ domain: 'example.com', createdAt: undefined as never })
    ];
    expect(calculateBlockingDays('example.com', blockList, NOW)).toBeNull();
  });

  it('完全一致した項目の経過日数を返す', () => {
    const blockList = [
      makeBlockItem({
        domain: 'example.com',
        createdAt: '2024-06-01T00:00:00Z'
      })
    ];
    expect(calculateBlockingDays('example.com', blockList, NOW)).toBe(14);
  });

  it('登録当日は最小値の 1 を返す', () => {
    const blockList = [
      makeBlockItem({
        domain: 'example.com',
        createdAt: '2024-06-15T00:00:00Z'
      })
    ];
    expect(calculateBlockingDays('example.com', blockList, NOW)).toBe(1);
  });

  it('サブドメインで遮られた場合は親ドメインの項目の日数を返す', () => {
    const blockList = [
      makeBlockItem({
        domain: 'example.com',
        createdAt: '2024-06-01T00:00:00Z'
      })
    ];
    expect(calculateBlockingDays('www.example.com', blockList, NOW)).toBe(14);
  });

  it('ワイルドカード項目に一致した場合はその項目の日数を返す', () => {
    const blockList = [
      makeBlockItem({
        domain: '*.example.com',
        isWildcard: true,
        createdAt: '2024-06-10T00:00:00Z'
      })
    ];
    expect(calculateBlockingDays('sub.example.com', blockList, NOW)).toBe(5);
  });

  it('端数の時間は切り捨てる', () => {
    const blockList = [
      makeBlockItem({
        domain: 'example.com',
        createdAt: '2024-06-12T01:00:00Z'
      })
    ];
    // 2 日と 23 時間経過 → 3 に繰り上げず 2 に切り捨てる
    expect(calculateBlockingDays('example.com', blockList, NOW)).toBe(2);
  });
});
