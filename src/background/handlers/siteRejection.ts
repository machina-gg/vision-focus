import type { AddSiteRejection } from '~/lib/siteService';
import type { MessageError } from '~/types/messages';

type DuplicateSiteCode = 'already-blocked' | 'already-tracked';

/** サイトの追加を拒んだ理由を、画面へ返す失敗の種類にする */
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
