import type { MessageHandler } from '~/lib/messaging';
import { addBlock } from '~/lib/siteService';
import { updateBlockRules, blockExistingTabs } from '../blocker';
import { addSiteError } from './siteRejection';

export const addBlockHandler: MessageHandler<'add-block'> = async ({
  data
}) => {
  const { domain } = data;

  if (!domain) {
    return { success: false, error: { code: 'invalid-request' } };
  }

  const result = await addBlock(domain, new Date());
  if (result.rejection !== null) {
    return {
      success: false,
      error: addSiteError(domain, result.rejection, 'already-blocked')
    };
  }

  await updateBlockRules();
  await blockExistingTabs();

  return { success: true };
};
