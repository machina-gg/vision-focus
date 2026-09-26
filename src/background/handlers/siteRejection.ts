import { getMessage } from '~/lib/i18n';
import type { AddSiteRejection } from '~/lib/siteService';
import type { NestedSite } from '~/lib/siteKey';

/**
 * 入れ子の理由を利用者に見せる文言にする（`relation` は既存のサイトから見た関係）。
 * 追加元（ブロックリスト・ポップアップ・インポート）はこの文言をそのまま表示する
 */
export function nestedSiteMessage(input: string, nested: NestedSite): string {
  const key =
    nested.relation === 'ancestor'
      ? 'siteErrorInsideTrackedSite'
      : 'siteErrorContainsTrackedSite';
  return getMessage(key, [input, nested.site]);
}

/** 追加を拒否した理由を応答の error にする */
export function addSiteError(
  input: string,
  rejection: AddSiteRejection,
  duplicateMessage: string
): string {
  if (rejection.reason === 'nested') {
    return nestedSiteMessage(input, rejection.nested);
  }
  return rejection.reason === 'duplicate'
    ? duplicateMessage
    : 'Invalid domain format';
}
