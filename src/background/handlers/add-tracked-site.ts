import type { MessageHandler } from '~/lib/messaging';
import { addTrackedSite } from '~/lib/siteService';
import { addSiteError } from './siteRejection';

/**
 * ブロックせずに追跡だけを始める（分析タブの「追跡サイトを追加」）。
 * 既に追跡中のサイト・入れ子になるキーは拒否する。ブロックは変わらないのでルールは作り直さない
 */
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
