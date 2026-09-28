import type { ScheduleRejection } from '~/lib/settingsService';
import type { MessageError } from '~/types/messages';

/**
 * スケジュールの書き込みを拒んだ理由を、画面へ返す失敗の種類にする
 * @param rejection settingsService が返した拒否の理由
 * @returns 画面へ返す失敗
 */
export function scheduleError(rejection: ScheduleRejection): MessageError {
  switch (rejection) {
    case 'overlap':
      return { code: 'schedule-overlap' };
    case 'not-found':
      return { code: 'schedule-not-found' };
    case 'preset-not-found':
      return { code: 'preset-not-found' };
  }
}
