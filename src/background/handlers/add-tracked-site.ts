import type { MessageHandler } from '~/lib/messaging';
import { addTrackedSite } from '~/lib/siteService';
import { addSiteError } from './siteRejection';

/**
 * add-tracked-site: ドメインを追跡対象（滞在時間を記録するサイト）に加える
 * @param message data.domain に加えるドメイン（入力のまま。サイトキーへの変換は siteService が行う）
 * @returns 成功か、失敗の種類（invalid-request / nested-site / already-tracked / invalid-domain）
 */
export const addTrackedSiteHandler: MessageHandler<
  'add-tracked-site'
> = async ({ data }) => {
  const domain = data?.domain;
  if (!domain || typeof domain !== 'string') {
    return { success: false, error: { code: 'invalid-request' } };
  }

  const result = await addTrackedSite(domain, new Date());
  if (result.rejection !== null) {
    return {
      success: false,
      error: addSiteError(domain, result.rejection, 'already-tracked')
    };
  }
  return { success: true };
};
