import type { MessageHandler } from '~/lib/messaging';
import { updatePreset } from '~/lib/settingsService';
import {
  BackgroundImageDataUrlSchema,
  UpdatePresetBodySchema
} from '~/types/messageSchemas';
import { presetError } from './presetRejection';

/**
 * update-preset: スタイルの名前・表示設定・画像を置き換える
 * @param message data.id に対象のスタイル、data.name / data.display / data.image に新しい名前・表示設定・画像の変え方
 * @returns 成功か、失敗の種類（invalid-request / image-invalid / preset-not-found / save-failed）
 */
export const updatePresetHandler: MessageHandler<'update-preset'> = async ({
  data
}) => {
  const parsed = UpdatePresetBodySchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, error: { code: 'invalid-request' } };
  }

  if (
    parsed.data.image.kind === 'set' &&
    !BackgroundImageDataUrlSchema.safeParse(parsed.data.image.dataUrl).success
  ) {
    return { success: false, error: { code: 'image-invalid' } };
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
