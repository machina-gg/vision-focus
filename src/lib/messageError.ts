import { getMessage } from '~/lib/i18n';
import type { MessageError } from '~/types/messages';

/** background が返した失敗の種類を表示する文言にする（種類が無い・送れなかった失敗は汎用の文言） */
export function messageErrorText(error: MessageError | undefined): string {
  switch (error?.code) {
    case 'invalid-domain':
      return getMessage('siteErrorInvalidDomain');
    case 'already-blocked':
      return getMessage('siteErrorAlreadyBlocked');
    case 'already-tracked':
      return getMessage('siteErrorAlreadyTracked');
    case 'nested-site':
      return getMessage(
        error.nested.relation === 'ancestor'
          ? 'siteErrorInsideTrackedSite'
          : 'siteErrorContainsTrackedSite',
        [error.domain, error.nested.site]
      );
    case 'block-not-found':
      return getMessage('siteErrorBlockNotFound');
    case 'site-in-use':
      return getMessage('siteErrorInUse');
    case 'save-failed':
      return getMessage('errorSaveFailed');
    case 'invalid-request':
    case 'invalid-url':
    case undefined:
      return getMessage('errorOperationFailed');
  }
}
