// 書き込みはモジュール内の待ち行列で直列化する。background 以外から呼ぶと直列化が効かず変更が消える

import { createSerialQueue } from '~/lib/serialQueue';
import { applyImportedSettings } from '~/lib/settingsExport';
import { getSettings, settingsItem } from '~/lib/storage';
import type { ExportedData } from '~/types/messageSchemas';
import type { AppSettings } from '~/types/storage';

const enqueue = createSerialQueue();

/** `change` は読み出した値を書き換えず、変更後の値を返す（変更が無ければ null） */
async function mutateSettings(
  change: (current: AppSettings) => AppSettings | null
): Promise<void> {
  await enqueue(async () => {
    const next = change(await getSettings());
    if (next) await settingsItem.setValue(next);
  });
}

/**
 * すべてのブロックの一時停止を切り替えて保存する
 * @param paused true = 一時停止する / false = 再開する
 */
export async function setPaused(paused: boolean): Promise<void> {
  await mutateSettings((current) => ({ ...current, paused }));
}

/**
 * 設定ファイルのスケジュール・通知・長押し確認を、保存済みの設定に重ねて保存する（重ね方は applyImportedSettings）
 * @param data 取り込む設定ファイルの中身（検証済み）
 */
export async function importSettings(
  data: Pick<ExportedData, 'schedules' | 'notifications' | 'unblockConfirm'>
): Promise<void> {
  await mutateSettings((current) => applyImportedSettings(data, current));
}
