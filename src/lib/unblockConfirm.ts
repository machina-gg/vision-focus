import type { AppSettings, UnblockHoldSeconds } from '~/types/storage';
import {
  DEFAULT_UNBLOCK_CONFIRM_SETTINGS,
  UNBLOCK_HOLD_SECONDS_OPTIONS
} from '~/types/storage';

/**
 * 長押し確認の秒数を設定から取り出す。
 *
 * 保存領域の fallback は設定全体が未保存のときしか効かないため、この項目を
 * 持たない保存データ（項目の追加前から使っている人）ではここで既定値に倒す。
 * 選択肢に無い値が入っていた場合も既定値に倒す（長押しが 0 秒や極端な長さに
 * なって、確認が効かない・解除できないという状態を作らないため）。
 */
export function getUnblockHoldSeconds(
  settings: Pick<AppSettings, 'unblockConfirm'> | undefined
): UnblockHoldSeconds {
  const holdSeconds: unknown = settings?.unblockConfirm?.holdSeconds;
  return (
    UNBLOCK_HOLD_SECONDS_OPTIONS.find((value) => value === holdSeconds) ??
    DEFAULT_UNBLOCK_CONFIRM_SETTINGS.holdSeconds
  );
}
