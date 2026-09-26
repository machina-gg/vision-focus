import type { MessageHandler } from '~/lib/messaging';
import { addBlock } from '~/lib/siteService';
import { updateBlockRules, blockExistingTabs } from '../blocker';
import { addSiteError } from './siteRejection';

/**
 * ブロックリストに追加する。追跡中のサイトが無ければ作り、追跡だけのサイトならブロック設定を足す。
 * 既存のサイトと入れ子になるキーは拒否する
 */
export const addBlockHandler: MessageHandler<'add-block'> = async ({
  data
}) => {
  const { domain } = data;

  if (!domain) {
    return { success: false, error: 'Domain is required' };
  }

  const result = await addBlock(domain, new Date());
  if (result.rejection !== null) {
    return {
      success: false,
      error: addSiteError(
        domain,
        result.rejection,
        'Domain already in block list'
      )
    };
  }

  await updateBlockRules();
  await blockExistingTabs();

  return { success: true };
};
