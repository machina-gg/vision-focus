import type { AddSiteRejection } from '~/lib/siteService';
import type { MessageError } from '~/types/messages';

type DuplicateSiteCode = 'already-blocked' | 'already-tracked';

/**
 * サイトの追加を拒んだ理由を、画面へ返す失敗の種類にする
 * @param input 利用者が入力したドメイン（入れ子のときに画面へそのまま示す）
 * @param rejection siteService が返した拒否の理由
 * @param duplicate 既に登録済みだったときに返す失敗の種類（ブロックへの追加か追跡への追加かで分ける）
 * @returns 画面へ返す失敗
 */
export function addSiteError(
  input: string,
  rejection: AddSiteRejection,
  duplicate: DuplicateSiteCode
): MessageError {
  switch (rejection.reason) {
    case 'nested':
      return { code: 'nested-site', domain: input, nested: rejection.nested };
    case 'duplicate':
      return { code: duplicate };
    case 'invalid':
      return { code: 'invalid-domain' };
  }
}
