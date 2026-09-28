import type { MessageHandler } from '~/lib/messaging';
import { updatePreset } from '~/lib/settingsService';
import { UpdatePresetBodySchema } from '~/types/messageSchemas';
import { presetError } from './presetRejection';

/**
 * update-preset: スタイルの名前と表示設定を置き換える
 * @param message data.id に対象のスタイル、data.name / data.display に新しい名前と表示設定
 * @returns 成功か、失敗の種類（invalid-request / preset-not-found / save-failed）
 */
export const updatePresetHandler: MessageHandler<'update-preset'> = async ({
  data
}) => {
  const parsed = UpdatePresetBodySchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, error: { code: 'invalid-request' } };
  }

  try {
    const rejection = await updatePreset(parsed.data);
    if (rejection) {
      return { success: false, error: presetError(rejection) };
    }
    return { success: true };
  } catch {
    return { success: false, error: { code: 'save-failed' } };
  }
};
