// 書き込みはモジュール内の待ち行列で直列化する。background 以外から呼ぶと直列化が効かず変更が消える

import { findOverlappingSchedule } from '~/lib/scheduleOverlap';
import { createSerialQueue } from '~/lib/serialQueue';
import { applyImportedSettings } from '~/lib/settingsExport';
import { getSettings, getVision, settingsItem } from '~/lib/storage';
import type { ExportedData, ScheduleInput } from '~/types/messageSchemas';
import type {
  AppSettings,
  NotificationSettings,
  Schedule,
  UnblockConfirmSettings,
  VisionSettings
} from '~/types/storage';

const enqueue = createSerialQueue();

interface SettingsChange<T> {
  next: AppSettings | null;
  result: T;
}

/** `change` は読み出した値を書き換えず、変更後の値（変更が無ければ null）と呼び出し元へ返す結果を返す */
async function mutateSettings<T>(
  change: (current: AppSettings, vision: VisionSettings) => SettingsChange<T>
): Promise<T> {
  return enqueue(async () => {
    const [current, vision] = await Promise.all([getSettings(), getVision()]);
    const { next, result } = change(current, vision);
    if (next) await settingsItem.setValue(next);
    return result;
  });
}

async function replaceSettings(
  change: (current: AppSettings) => AppSettings
): Promise<void> {
  await mutateSettings((current) => ({
    next: change(current),
    result: undefined
  }));
}

/** スケジュールの書き込みを拒んだ理由 */
export type ScheduleRejection =
  /** 曜日を共有し時間帯が交差するスケジュールが既にある */
  | 'overlap'
  /** 指定された ID のスケジュールが無い */
  | 'not-found'
  /** 指定されたスタイルが無い */
  | 'preset-not-found';

function checkScheduleInput(
  input: ScheduleInput,
  current: AppSettings,
  vision: VisionSettings,
  excludeId?: string
): ScheduleRejection | null {
  if (findOverlappingSchedule(input, current.schedules, excludeId)) {
    return 'overlap';
  }
  if (
    input.presetId !== undefined &&
    !vision.presets.some((preset) => preset.id === input.presetId)
  ) {
    return 'preset-not-found';
  }
  return null;
}

function toSchedule(
  id: string,
  enabled: boolean,
  input: ScheduleInput
): Schedule {
  return {
    id,
    name: input.name,
    startTime: input.startTime,
    endTime: input.endTime,
    days: input.days,
    enabled,
    ...(input.presetId !== undefined && { presetId: input.presetId })
  };
}

/**
 * すべてのブロックの一時停止を切り替えて保存する
 * @param paused true = 一時停止する / false = 再開する
 */
export async function setPaused(paused: boolean): Promise<void> {
  await replaceSettings((current) => ({ ...current, paused }));
}

/**
 * スケジュールを有効な状態で足す（ID はここで振る）。重なりとスタイルの存在は保存済みの最新の値で調べる
 * @param input 足すスケジュールの入力値（検証済み）
 * @returns 拒んだ理由（overlap / preset-not-found）。足したら null
 */
export async function addSchedule(
  input: ScheduleInput
): Promise<ScheduleRejection | null> {
  return mutateSettings((current, vision) => {
    const rejection = checkScheduleInput(input, current, vision);
    if (rejection) return { next: null, result: rejection };

    const schedule = toSchedule(crypto.randomUUID(), true, input);
    return {
      next: { ...current, schedules: [...current.schedules, schedule] },
      result: null
    };
  });
}

/**
 * 同じ ID のスケジュールの入力値を置き換える（有効・無効は保存済みの値を保つ）。存在・重なり・スタイルの存在は保存済みの最新の値で調べる
 * @param id 置き換えるスケジュールの ID
 * @param input 新しい入力値（検証済み）
 * @returns 拒んだ理由（not-found / overlap / preset-not-found）。置き換えたら null
 */
export async function updateSchedule(
  id: string,
  input: ScheduleInput
): Promise<ScheduleRejection | null> {
  return mutateSettings((current, vision) => {
    const existing = current.schedules.find((schedule) => schedule.id === id);
    if (!existing) return { next: null, result: 'not-found' };

    const rejection = checkScheduleInput(input, current, vision, id);
    if (rejection) return { next: null, result: rejection };

    const updated = toSchedule(id, existing.enabled, input);
    return {
      next: {
        ...current,
        schedules: current.schedules.map((schedule) =>
          schedule.id === id ? updated : schedule
        )
      },
      result: null
    };
  });
}

/**
 * スケジュールを消す
 * @param id 消すスケジュールの ID
 * @returns 拒んだ理由（not-found）。消したら null
 */
export async function removeSchedule(
  id: string
): Promise<ScheduleRejection | null> {
  return mutateSettings((current) => {
    if (!current.schedules.some((schedule) => schedule.id === id)) {
      return { next: null, result: 'not-found' };
    }
    return {
      next: {
        ...current,
        schedules: current.schedules.filter((schedule) => schedule.id !== id)
      },
      result: null
    };
  });
}

/** スケジュールの有効・無効の切り替えの結果 */
export type SetScheduleEnabledResult =
  | {
      /** 指定された ID のスケジュールが無い */
      rejection: 'not-found';
    }
  | {
      /** 切り替えたので null */
      rejection: null;
      /** 同じ書き込みで一時停止を解いたか */
      resumed: boolean;
    };

/**
 * スケジュールの有効・無効を切り替える。有効にしたとき一時停止中なら、同じ書き込みで一時停止も解く
 * @param id 切り替えるスケジュールの ID
 * @param enabled true = 有効にする / false = 無効にする
 * @returns 切り替えの結果
 */
export async function setScheduleEnabled(
  id: string,
  enabled: boolean
): Promise<SetScheduleEnabledResult> {
  return mutateSettings<SetScheduleEnabledResult>((current) => {
    if (!current.schedules.some((schedule) => schedule.id === id)) {
      return { next: null, result: { rejection: 'not-found' } };
    }
    const resumed = enabled && current.paused;
    return {
      next: {
        ...current,
        paused: resumed ? false : current.paused,
        schedules: current.schedules.map((schedule) =>
          schedule.id === id ? { ...schedule, enabled } : schedule
        )
      },
      result: { rejection: null, resumed }
    };
  });
}

/**
 * 残り時間の通知の設定を保存する
 * @param notifications 新しい通知の設定（検証済み）
 */
export async function setNotifications(
  notifications: NotificationSettings
): Promise<void> {
  await replaceSettings((current) => ({ ...current, notifications }));
}

/**
 * 長押し確認の設定を保存する
 * @param unblockConfirm 新しい長押し確認の設定（検証済み）
 */
export async function setUnblockConfirm(
  unblockConfirm: UnblockConfirmSettings
): Promise<void> {
  await replaceSettings((current) => ({ ...current, unblockConfirm }));
}

/**
 * 利用状況の送信への同意・拒否を、選んだ時刻とともに保存する
 * @param enabled true = 同意する / false = 拒否する
 * @param decidedAt 選んだ時刻
 */
export async function setAnalyticsOptIn(
  enabled: boolean,
  decidedAt: Date
): Promise<void> {
  await replaceSettings((current) => ({
    ...current,
    analyticsOptIn: { enabled, decidedAt: decidedAt.toISOString() }
  }));
}

/**
 * 設定ファイルのスケジュール・通知・長押し確認を、保存済みの設定に重ねて保存する（重ね方は applyImportedSettings）
 * @param data 取り込む設定ファイルの中身（検証済み）
 */
export async function importSettings(
  data: Pick<ExportedData, 'schedules' | 'notifications' | 'unblockConfirm'>
): Promise<void> {
  await replaceSettings((current) => applyImportedSettings(data, current));
}
