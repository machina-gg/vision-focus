import type { MessageHandler } from '~/lib/messaging';
import { createPreset } from '~/lib/settingsService';
import { CreatePresetBodySchema } from '~/types/messageSchemas';
import { presetError } from './presetRejection';

/**
 * create-preset: 既定の表示設定のスタイルを足す（ID は background が振り、件数は上限まで）
 * @param message data.name に作るスタイルの名前
 * @returns 成功時は作ったスタイルの id。失敗は invalid-request / preset-limit / save-failed
 */
export const createPresetHandler: MessageHandler<'create-preset'> = async ({
  data
}) => {
  const parsed = CreatePresetBodySchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, error: { code: 'invalid-request' } };
  }

  try {
    const result = await createPreset(parsed.data.name, new Date());
    if (result.rejection) {
      return { success: false, error: presetError(result.rejection) };
    }
    return { success: true, id: result.id };
  } catch {
    return { success: false, error: { code: 'save-failed' } };
  }
};
