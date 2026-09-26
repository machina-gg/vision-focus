import type { MessageHandler } from '~/lib/messaging';
import { addBlock } from '~/lib/siteService';
import { updateBlockRules, blockExistingTabs } from '../blocker';
import { addSiteError } from './siteRejection';

/**
 * add-block: ドメインをブロック対象に加え、ルールを更新して開いているタブもブロックする
 * @param message data.domain に加えるドメイン（入力のまま。サイトキーへの変換は siteService が行う）
 * @returns 成功か、失敗の種類（invalid-request / nested-site / already-blocked / invalid-domain）
 */
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
