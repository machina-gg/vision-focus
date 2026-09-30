// 書き込みはモジュール内の待ち行列で直列化する。background 以外から呼ぶと直列化が効かず変更が消える

import { storage as extensionStorage } from '@wxt-dev/storage';

import { MAX_PRESETS } from '~/constants/limits';
import { hashPassword, isProtectedByPassword } from '~/lib/password';
import { findOverlappingSchedule } from '~/lib/scheduleOverlap';
import { createSerialQueue } from '~/lib/serialQueue';
import {
  applyImportedSettings,
  applyImportedVision
} from '~/lib/settingsExport';
import {
  backgroundImageKey,
  getSettings,
  getVision,
  settingsItem,
  visionItem
} from '~/lib/storage';
import type {
  ExportedData,
  PresetImageInput,
  ScheduleInput,
  UpdatePresetBody
} from '~/types/messageSchemas';
import {
  DEFAULT_DISPLAY_SETTINGS,
  type AppSettings,
  type DashboardPreset,
  type NotificationSettings,
  type PasswordSettings,
  type Schedule,
  type UnblockConfirmSettings,
  type VisionSettings
} from '~/types/storage';

const enqueue = createSerialQueue();

interface StorageChange<T> {
  settings?: AppSettings;
  vision?: VisionSettings;
  /** 足す画像（キーは画像の ID） */
  images?: Record<string, string>;
  /** 消す画像の ID */
  removedImageIds?: string[];
  result: T;
}

/** `change` は読み出した値を書き換えず、変更後の値（変更の無い項目は省く）と呼び出し元へ返す結果を返す。画像を消してから、設定・表示設定・足す画像を 1 回の書き込みで書く */
async function mutate<T>(
  change: (current: AppSettings, vision: VisionSettings) => StorageChange<T>
): Promise<T> {
  return enqueue(async () => {
    const [current, vision] = await Promise.all([getSettings(), getVision()]);
    const next = change(current, vision);
    // 逆順（書いてから消す）にすると、間で止まったときに持ち主のいない画像が残る
    const removedKeys = (next.removedImageIds ?? []).map(backgroundImageKey);
    if (removedKeys.length > 0) await extensionStorage.removeItems(removedKeys);
    const writes = [
      ...(next.settings ? [{ item: settingsItem, value: next.settings }] : []),
      ...(next.vision ? [{ item: visionItem, value: next.vision }] : []),
      ...Object.entries(next.images ?? {}).map(([imageId, dataUrl]) => ({
        key: backgroundImageKey(imageId),
        value: dataUrl
      }))
    ];
    if (writes.length > 0) await extensionStorage.setItems(writes);
    return next.result;
  });
}

async function replaceSettings(
  change: (current: AppSettings) => AppSettings
): Promise<void> {
  await mutate((current) => ({
    settings: change(current),
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
  return mutate((current, vision) => {
    const rejection = checkScheduleInput(input, current, vision);
    if (rejection) return { result: rejection };

    const schedule = toSchedule(crypto.randomUUID(), true, input);
    return {
      settings: { ...current, schedules: [...current.schedules, schedule] },
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
  return mutate((current, vision) => {
    const existing = current.schedules.find((schedule) => schedule.id === id);
    if (!existing) return { result: 'not-found' };

    const rejection = checkScheduleInput(input, current, vision, id);
    if (rejection) return { result: rejection };

    const updated = toSchedule(id, existing.enabled, input);
    return {
      settings: {
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
  return mutate((current) => {
    if (!current.schedules.some((schedule) => schedule.id === id)) {
      return { result: 'not-found' };
    }
    return {
      settings: {
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
  return mutate<SetScheduleEnabledResult>((current) => {
    if (!current.schedules.some((schedule) => schedule.id === id)) {
      return { result: { rejection: 'not-found' } };
    }
    const resumed = enabled && current.paused;
    return {
      settings: {
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

/** 設定ファイルの取り込みの結果 */
export interface ImportSettingsResult {
  /** 上限（MAX_PRESETS）を超えるため取り込まなかったスタイルの名前（ファイルの並び順） */
  skippedPresets: string[];
  /** 取り込まなかったスタイルを指していたため、適用中のスタイルを外したか */
  clearedActivePreset: boolean;
  /** 取り込まなかったスタイルを指していたため、スケジュールからスタイルを外したか */
  clearedSchedulePresets: boolean;
}

/**
 * 設定ファイルの設定・表示設定・画像で保存済みの値を置き換える（置き換え方は applyImportedSettings / applyImportedVision。スタイルは MAX_PRESETS 件まで。今のスタイルの画像を消してから、設定・表示設定・新しい ID で作った画像を 1 回の書き込みで保存する）
 * @param data 取り込む設定ファイルの中身（検証済み）
 * @returns 取り込まなかったスタイルと、それを指していた参照を外したか
 */
export async function importSettings(
  data: Omit<ExportedData, 'sites'>
): Promise<ImportSettingsResult> {
  return mutate<ImportSettingsResult>((current, vision) => {
    const {
      vision: nextVision,
      images,
      removedImageIds,
      skippedPresets
    } = applyImportedVision(data, vision, MAX_PRESETS, () =>
      crypto.randomUUID()
    );
    const skippedIds = new Set(skippedPresets.map((preset) => preset.id));

    let clearedSchedulePresets = false;
    const schedules = data.schedules.map((schedule) => {
      if (schedule.presetId === undefined || !skippedIds.has(schedule.presetId))
        return schedule;
      clearedSchedulePresets = true;
      const { presetId: _presetId, ...rest } = schedule;
      return rest;
    });

    return {
      settings: applyImportedSettings({ ...data, schedules }, current),
      vision: nextVision,
      images,
      removedImageIds,
      result: {
        skippedPresets: skippedPresets.map((preset) => preset.name),
        clearedActivePreset:
          data.activePresetId !== null && skippedIds.has(data.activePresetId),
        clearedSchedulePresets
      }
    };
  });
}

/** スタイルの書き込みを拒んだ理由 */
export type PresetRejection =
  /** 指定された ID のスタイルが無い */
  | 'not-found'
  /** スタイルが上限（MAX_PRESETS）に達している */
  | 'limit';

/** スタイルの作成の結果 */
export type CreatePresetResult =
  | {
      /** 上限に達している */
      rejection: 'limit';
    }
  | {
      /** 作ったので null */
      rejection: null;
      /** 作ったスタイルの ID */
      id: string;
    };

/**
 * 既定の表示設定（画像なし）のスタイルを末尾に足す（ID はここで振る）。件数は保存済みの最新の値で数える
 * @param name スタイルの名前（検証済み）
 * @param createdAt 作成した時刻
 * @returns 作ったスタイルの ID か、上限に達していたこと
 */
export async function createPreset(
  name: string,
  createdAt: Date
): Promise<CreatePresetResult> {
  return mutate<CreatePresetResult>((_current, vision) => {
    if (vision.presets.length >= MAX_PRESETS) {
      return { result: { rejection: 'limit' } };
    }
    const preset: DashboardPreset = {
      ...DEFAULT_DISPLAY_SETTINGS,
      id: crypto.randomUUID(),
      name,
      createdAt: createdAt.toISOString(),
      customBackgroundId: null
    };
    return {
      vision: { ...vision, presets: [...vision.presets, preset] },
      result: { rejection: null, id: preset.id }
    };
  });
}

interface ImageChange {
  customBackgroundId: string | null;
  images?: Record<string, string>;
  removedImageIds?: string[];
}

function changeImage(
  currentId: string | null,
  image: PresetImageInput
): ImageChange {
  const removedImageIds = currentId === null ? [] : [currentId];
  switch (image.kind) {
    case 'keep':
      return { customBackgroundId: currentId };
    case 'clear':
      return { customBackgroundId: null, removedImageIds };
    case 'set': {
      // 同じ ID の中身を書き換えないので、画面は ID ごとに 1 回読めば済む
      const imageId = crypto.randomUUID();
      return {
        customBackgroundId: imageId,
        images: { [imageId]: image.dataUrl },
        removedImageIds
      };
    }
  }
}

/**
 * スタイルの名前・表示設定・画像を置き換える（ID と作成時刻は保つ）。画像を変えるときは新しい ID で作り、古い画像を先に消してからスタイルを書く
 * @param input 置き換える内容（検証済み。set の画像も検証済み）
 * @returns 拒んだ理由（not-found）。置き換えたら null
 */
export async function updatePreset(
  input: UpdatePresetBody
): Promise<PresetRejection | null> {
  return mutate((_current, vision) => {
    const existing = vision.presets.find((preset) => preset.id === input.id);
    if (!existing) return { result: 'not-found' };

    const { customBackgroundId, images, removedImageIds } = changeImage(
      existing.customBackgroundId,
      input.image
    );
    const updated: DashboardPreset = {
      ...input.display,
      id: existing.id,
      name: input.name,
      createdAt: existing.createdAt,
      customBackgroundId
    };
    return {
      images,
      removedImageIds,
      vision: {
        ...vision,
        presets: vision.presets.map((preset) =>
          preset.id === input.id ? updated : preset
        )
      },
      result: null
    };
  });
}

/**
 * スタイルを適用中にする
 * @param id 適用するスタイルの ID
 * @returns 拒んだ理由（not-found）。適用したら null
 */
export async function applyPreset(id: string): Promise<PresetRejection | null> {
  return mutate((_current, vision) => {
    if (!vision.presets.some((preset) => preset.id === id)) {
      return { result: 'not-found' };
    }
    return { vision: { ...vision, activePresetId: id }, result: null };
  });
}

/**
 * スタイルとその画像を消し、適用中ならその指定を外し、参照しているスケジュールからも外す（画像を先に消してから、設定と表示設定を 1 回の書き込みで保存する）
 * @param id 消すスタイルの ID
 * @returns 拒んだ理由（not-found）。消したら null
 */
export async function deletePreset(
  id: string
): Promise<PresetRejection | null> {
  return mutate((current, vision) => {
    const target = vision.presets.find((preset) => preset.id === id);
    if (!target) {
      return { result: 'not-found' };
    }
    const referenced = current.schedules.some(
      (schedule) => schedule.presetId === id
    );
    return {
      removedImageIds:
        target.customBackgroundId === null ? [] : [target.customBackgroundId],
      ...(referenced && {
        settings: {
          ...current,
          schedules: current.schedules.map((schedule) => {
            if (schedule.presetId !== id) return schedule;
            const { presetId: _presetId, ...rest } = schedule;
            return rest;
          })
        }
      }),
      vision: {
        ...vision,
        presets: vision.presets.filter((preset) => preset.id !== id),
        activePresetId:
          vision.activePresetId === id ? null : vision.activePresetId
      },
      result: null
    };
  });
}

/**
 * 既定の表示設定の目標文を書き換える
 * @param goalText 新しい目標文（検証済み）
 */
export async function setGoalText(goalText: string): Promise<void> {
  await mutate((_current, vision) => ({
    vision: {
      ...vision,
      defaultSettings: { ...vision.defaultSettings, goalText }
    },
    result: undefined
  }));
}

/** パスワードの書き込み・照合を拒んだ理由 */
export type PasswordRejection =
  /** パスワードが既に設定されている */
  | 'already-set'
  /** パスワードが設定されていない */
  | 'not-set'
  /** 添えられたパスワードが保存済みのものと一致しない */
  | 'mismatch'
  /** パスワード保護中にブロックを弱める操作へパスワードが添えられていない */
  | 'required';

function matchCurrent(
  password: PasswordSettings,
  inputHash: string
): 'not-set' | 'mismatch' | null {
  if (!isProtectedByPassword(password)) return 'not-set';
  return password.passwordHash === inputHash ? null : 'mismatch';
}

/**
 * パスワードを設定してパスワード保護を始める（強度は検査済みのものを受ける。保存するのは SHA-256 の 16 進）
 * @param password 新しいパスワード（平文）
 * @returns 拒んだ理由（already-set）。設定したら null
 */
export async function setPassword(
  password: string
): Promise<'already-set' | null> {
  const passwordHash = await hashPassword(password);
  return mutate((current) => {
    if (isProtectedByPassword(current.password))
      return { result: 'already-set' };
    return {
      settings: { ...current, password: { enabled: true, passwordHash } },
      result: null
    };
  });
}

/**
 * 今のパスワードを保存済みの値で照合してから、新しいパスワードに置き換える（新しいパスワードの強度は検査済みのものを受ける）
 * @param currentPassword 照合する今のパスワード（平文）
 * @param newPassword 新しいパスワード（平文）
 * @returns 拒んだ理由（not-set / mismatch）。置き換えたら null
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<'not-set' | 'mismatch' | null> {
  const [currentHash, passwordHash] = await Promise.all([
    hashPassword(currentPassword),
    hashPassword(newPassword)
  ]);
  return mutate((current) => {
    const rejection = matchCurrent(current.password, currentHash);
    if (rejection) return { result: rejection };
    return {
      settings: { ...current, password: { enabled: true, passwordHash } },
      result: null
    };
  });
}

/**
 * 今のパスワードを保存済みの値で照合してから、パスワード保護をやめる
 * @param currentPassword 照合する今のパスワード（平文）
 * @returns 拒んだ理由（not-set / mismatch）。やめたら null
 */
export async function removePassword(
  currentPassword: string
): Promise<'not-set' | 'mismatch' | null> {
  const currentHash = await hashPassword(currentPassword);
  return mutate((current) => {
    const rejection = matchCurrent(current.password, currentHash);
    if (rejection) return { result: rejection };
    return {
      settings: {
        ...current,
        password: { enabled: false, passwordHash: null }
      },
      result: null
    };
  });
}

/**
 * パスワード保護中に、操作に添えられたパスワードを保存済みの値で照合する（保護していなければ常に通す。添えられていれば弱めない操作でも照合する）
 * @param password 操作に添えられたパスワード（平文）。無ければ undefined
 * @param weakens その操作がブロックを弱めるか（true なら保護中はパスワードを必須にする）
 * @returns 拒んだ理由（required / mismatch）。通すなら null
 */
export async function checkUnblockPassword(
  password: string | undefined,
  weakens: boolean
): Promise<'required' | 'mismatch' | null> {
  const inputHash =
    password === undefined ? null : await hashPassword(password);
  return mutate((current) => {
    if (!isProtectedByPassword(current.password)) return { result: null };
    if (inputHash === null) return { result: weakens ? 'required' : null };
    return {
      result: current.password.passwordHash === inputHash ? null : 'mismatch'
    };
  });
}
