import type { MessageHandler } from '~/lib/messaging';
import { deletePreset } from '~/lib/settingsService';
import { PresetIdBodySchema } from '~/types/messageSchemas';
import { presetError } from './presetRejection';

/**
 * delete-preset: スタイルとその画像を消し、適用中の指定と、参照しているスケジュールの presetId を外す
 * @param message data.id に消すスタイルの ID
 * @returns 成功か、失敗の種類（invalid-request / preset-not-found / save-failed）
 */
export const deletePresetHandler: MessageHandler<'delete-preset'> = async ({
  data
}) => {
  const parsed = PresetIdBodySchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, error: { code: 'invalid-request' } };
  }

  try {
    const rejection = await deletePreset(parsed.data.id);
    if (rejection) {
      return { success: false, error: presetError(rejection) };
    }
    return { success: true };
  } catch {
    return { success: false, error: { code: 'save-failed' } };
  }
};
