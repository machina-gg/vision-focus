import type { MessageHandler } from '~/lib/messaging';
import { applyPreset } from '~/lib/settingsService';
import { PresetIdBodySchema } from '~/types/messageSchemas';
import { presetError } from './presetRejection';

/**
 * apply-preset: スタイルを適用中にする
 * @param message data.id に適用するスタイルの ID
 * @returns 成功か、失敗の種類（invalid-request / preset-not-found / save-failed）
 */
export const applyPresetHandler: MessageHandler<'apply-preset'> = async ({
  data
}) => {
  const parsed = PresetIdBodySchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, error: { code: 'invalid-request' } };
  }

  try {
    const rejection = await applyPreset(parsed.data.id);
    if (rejection) {
      return { success: false, error: presetError(rejection) };
    }
    return { success: true };
  } catch {
    return { success: false, error: { code: 'save-failed' } };
  }
};
