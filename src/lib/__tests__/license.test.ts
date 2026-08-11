import { describe, expect, it } from 'vitest';

import {
  checkPremiumStatus,
  canAccessFeature,
  getFeatureLimits,
  canAddToBlocklist
} from '~/lib/license';
import { FEATURE_LIMITS } from '~/types/premium';

/**
 * マネタイズ方針の変更により全機能を全ユーザーに開放したため、
 * これらの関数は課金状態に依存せず常に解放を返す。
 */
describe('license', () => {
  describe('checkPremiumStatus', () => {
    it('常に解放状態を返す', async () => {
      const status = await checkPremiumStatus();

      expect(status.isPremium).toBe(true);
      expect(status.source).toBeNull();
    });
  });

  describe('canAccessFeature', () => {
    it('常に利用可能を返す', async () => {
      await expect(canAccessFeature()).resolves.toBe(true);
    });
  });

  describe('getFeatureLimits', () => {
    it('単一の機能上限を返す', async () => {
      await expect(getFeatureLimits()).resolves.toEqual(FEATURE_LIMITS);
    });

    it('分析履歴とブロックリストは無制限', async () => {
      const limits = await getFeatureLimits();

      expect(limits.historyDays).toBe(Infinity);
      expect(limits.maxBlockList).toBe(Infinity);
    });

    it('スタイルの上限は 10 件', async () => {
      const limits = await getFeatureLimits();

      expect(limits.maxPresets).toBe(10);
    });
  });

  describe('canAddToBlocklist', () => {
    it.each([0, 5, 100, 10000])(
      '登録数 %i 件でも追加できる',
      async (currentCount) => {
        const result = await canAddToBlocklist(currentCount);

        expect(result.allowed).toBe(true);
        expect(result.limit).toBe(Infinity);
      }
    );

    it('上限が無いため拒否の理由文は返さない', async () => {
      const result = await canAddToBlocklist(0);

      expect(result.reason).toBeUndefined();
    });
  });
});
