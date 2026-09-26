import type { MessageHandler } from '~/lib/messaging';
import { GetRemainingTimeBodySchema } from '~/types/messageSchemas';
import { extractDomain } from '~/lib/domain';
import { getSiteBlockStatus } from '~/lib/blockService';
import type { TimeLimitInfo } from '~/types/messages';

/**
 * URL のサイトの時間制限を返す。ブロック設定が無い・無効なサイトは null。
 * 残り時間は判定と同じ `evaluateBlock` の値を使う（別に計算すると、バッジの残り時間と
 * 実際にブロックされる時刻がずれる）
 */
async function getTimeLimitInfo(url: string): Promise<TimeLimitInfo | null> {
  const hostname = extractDomain(url);
  if (!hostname) return null;

  const status = await getSiteBlockStatus(hostname);
  if (!status || !status.rule.enabled) return null;

  const { timeLimit } = status.rule;
  if (!timeLimit) {
    return {
      hasTimeLimit: false,
      remainingSeconds: null,
      limitType: null,
      limitSeconds: null
    };
  }

  return {
    hasTimeLimit: true,
    remainingSeconds: status.state.remainingSeconds ?? null,
    limitType: timeLimit.type,
    limitSeconds: timeLimit.limitSeconds
  };
}

// Message handler for getting remaining time for a URL
export const getRemainingTimeHandler: MessageHandler<
  'get-remaining-time'
> = async ({ data }) => {
  const parsed = GetRemainingTimeBodySchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, error: 'Invalid URL' };
  }

  const info = await getTimeLimitInfo(parsed.data.url);

  return {
    success: true,
    data: info
  };
};
