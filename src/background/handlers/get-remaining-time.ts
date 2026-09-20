import type { MessageHandler } from '~/lib/messaging';
import { GetRemainingTimeBodySchema } from '~/types/messageSchemas';
import { getTimeLimitInfoForUrl } from '../time-limit';

// Message handler for getting remaining time for a URL
export const getRemainingTimeHandler: MessageHandler<
  'get-remaining-time'
> = async ({ data }) => {
  const parsed = GetRemainingTimeBodySchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, error: 'Invalid URL' };
  }

  const { url } = parsed.data;

  const info = await getTimeLimitInfoForUrl(url);

  return {
    success: true,
    data: info
  };
};
