import type { MessageHandler } from '~/lib/messaging';
import { addAllowedSite } from '~/lib/siteService';
import { AddAllowedSiteBodySchema } from '~/types/messageSchemas';
import { updateBlockRules } from '../blocker';
import { addSiteError } from './siteRejection';

/**
 * add-allowed-site: ホストを許可サイトにし（「記録する」は OFF）、ルールを作り直す。許可はブロックを弱めるだけなので、開いているタブは置き換えない
 * @param message data.domain に許可するドメインか URL（入力のまま。サイトキーへの変換は siteService が行う）
 * @returns 成功か、失敗の種類（invalid-request / invalid-domain / already-blocked / already-tracked / nested-site）。既に許可サイトなら成功
 */
export const addAllowedSiteHandler: MessageHandler<
  'add-allowed-site'
> = async ({ data }) => {
  const parsed = AddAllowedSiteBodySchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: { code: 'invalid-request' } };
  }
  const { domain } = parsed.data;

  const result = await addAllowedSite(domain, new Date());
  if (result.rejection !== null) {
    return {
      success: false,
      error: addSiteError(domain, result.rejection, 'already-tracked')
    };
  }

  await updateBlockRules();
  return { success: true };
};
