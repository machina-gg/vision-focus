import { FEATURE_LIMITS, type FeatureLimits } from '~/types/premium';

interface PremiumStatusResult {
  isPremium: boolean;
  featureLimits: FeatureLimits;
  isLoading: boolean;
}

/**
 * 機能の利用可否を返すフック
 *
 * マネタイズ方針の変更により全機能を全ユーザーに開放したため、
 * 常に解放状態を返す。呼び出し側の分岐を段階的に削除するまでの互換のため、
 * isPremium / featureLimits のインターフェースは維持している。
 */
export function usePremiumStatus(): PremiumStatusResult {
  return {
    isPremium: true,
    featureLimits: FEATURE_LIMITS,
    isLoading: false
  };
}
