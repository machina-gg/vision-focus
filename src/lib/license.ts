import { FEATURE_LIMITS, type FeatureLimits } from '~/types/premium';

/**
 * 機能の利用可否を扱うモジュール
 *
 * マネタイズ方針を投げ銭とアフィリエイト推薦へ変更したため、
 * 全機能を全ユーザーに開放している。ExtensionPay による課金判定は行わない。
 *
 * 呼び出し側の分岐を段階的に整理するまでの互換のため、関数の
 * インターフェースは維持している。
 */

/**
 * 課金状態を返す（常に解放）
 */
export async function checkPremiumStatus(): Promise<{
  isPremium: boolean;
  source: 'extpay' | null;
}> {
  return { isPremium: true, source: null };
}

/**
 * 機能の利用可否を返す（常に利用可能）
 */
export async function canAccessFeature(): Promise<boolean> {
  return true;
}

/**
 * 機能上限を返す
 */
export async function getFeatureLimits(): Promise<FeatureLimits> {
  return FEATURE_LIMITS;
}

/**
 * ブロックリストに追加できるかを返す
 *
 * 上限は Infinity のため常に追加できるが、将来的に上限を設ける場合に
 * 備えて判定の形は維持している。
 */
export async function canAddToBlocklist(
  currentCount: number
): Promise<{ allowed: boolean; limit: number; reason?: string }> {
  const limits = FEATURE_LIMITS;

  if (currentCount >= limits.maxBlockList) {
    return {
      allowed: false,
      limit: limits.maxBlockList
    };
  }

  return {
    allowed: true,
    limit: limits.maxBlockList
  };
}
