import type { MessageHandler } from '~/lib/messaging';
import { setTimeLimit } from '~/lib/siteService';
import { updateBlockRules } from '../blocker';
import { UpdateTimeLimitBodySchema } from '~/types/messageSchemas';

export const updateTimeLimitHandler: MessageHandler<
  'update-time-limit'
> = async ({ data }) => {
  const parsed = UpdateTimeLimitBodySchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, error: { code: 'invalid-request' } };
  }

  const { domain, timeLimit } = parsed.data;

  try {
    const updated = await setTimeLimit(domain, timeLimit);
    if (!updated) {
      return { success: false, error: { code: 'block-not-found' } };
    }

    await updateBlockRules();

    return { success: true };
  } catch {
    return { success: false, error: { code: 'save-failed' } };
  }
};
