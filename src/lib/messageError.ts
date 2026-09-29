import { MAX_PRESETS } from '~/constants/limits';
import { getMessage } from '~/lib/i18n';
import type { MessageError } from '~/types/messages';

/**
 * background が返した失敗の種類を表示する文言にする（種類が無い・送れなかった失敗は汎用の文言）
 * @param error background が返した失敗（届かなかったときは undefined）
 * @returns 画面に出す翻訳済みの文言
 */
export function messageErrorText(error: MessageError | undefined): string {
  switch (error?.code) {
    case 'invalid-domain':
      return getMessage('siteErrorInvalidDomain');
    case 'already-blocked':
      return getMessage('siteErrorAlreadyBlocked');
    case 'already-tracked':
      return getMessage('siteErrorAlreadyTracked');
    case 'already-allowed':
      return getMessage('siteErrorAlreadyAllowed');
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
    case 'schedule-overlap':
      return getMessage('scheduleOverlapError');
    case 'preset-limit':
      return getMessage('maxPresetsReached', String(MAX_PRESETS));
    case 'image-invalid':
      return getMessage('imageErrorProcessFailed');
    case 'save-failed':
      return getMessage('errorSaveFailed');
    case 'password-required':
      return getMessage('passwordRequired');
    case 'password-mismatch':
      return getMessage('passwordIncorrect');
    case 'password-not-set':
      return getMessage('passwordNotSet');
    case 'password-invalid':
      return getMessage(
        error.reason === 'too-short' ? 'passwordTooShort' : 'passwordTooLong'
      );
    case 'password-already-set':
    case 'invalid-request':
    case 'invalid-url':
    case 'allow-not-found':
    case 'schedule-not-found':
    case 'preset-not-found':
    case undefined:
      return getMessage('errorOperationFailed');
  }
}
