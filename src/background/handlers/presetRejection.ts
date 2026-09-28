import type { PresetRejection } from '~/lib/settingsService';
import type { MessageError } from '~/types/messages';

/**
 * スタイルの書き込みを拒んだ理由を、画面へ返す失敗の種類にする
 * @param rejection settingsService が返した拒否の理由
 * @returns 画面へ返す失敗
 */
export function presetError(rejection: PresetRejection): MessageError {
  switch (rejection) {
    case 'not-found':
      return { code: 'preset-not-found' };
    case 'limit':
      return { code: 'preset-limit' };
  }
}
