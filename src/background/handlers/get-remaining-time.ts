import type { MessageHandler } from '~/lib/messaging';
import { GetRemainingTimeBodySchema } from '~/types/messageSchemas';
import { extractDomain } from '~/lib/domain';
import { getSiteBlockStatus } from '~/lib/blockService';
import type { TimeLimitInfo } from '~/types/messages';

// 残り時間は判定と同じ `evaluateBlock` から取る（別に計算すると実際のブロック時刻とずれる）
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

export const getRemainingTimeHandler: MessageHandler<
  'get-remaining-time'
> = async ({ data }) => {
  const parsed = GetRemainingTimeBodySchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, error: { code: 'invalid-url' } };
  }

  const info = await getTimeLimitInfo(parsed.data.url);

  return {
    success: true,
    data: info
  };
};
