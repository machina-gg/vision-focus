import type { MessageHandler } from '~/lib/messaging';
import { addTrackedSite } from '~/lib/siteService';
import { addSiteError } from './siteRejection';

export const addTrackedSiteHandler: MessageHandler<
  'add-tracked-site'
> = async ({ data }) => {
  const domain = data?.domain;
  if (!domain || typeof domain !== 'string') {
    return { success: false, error: 'Domain is required' };
  }

  const result = await addTrackedSite(domain, new Date());
  if (result.rejection !== null) {
    return {
      success: false,
      error: addSiteError(domain, result.rejection, 'Site already tracked')
    };
  }
  return { success: true };
};
