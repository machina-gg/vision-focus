import { describe, it, expect } from 'vitest';

import { YouTubeSettingsSchema } from '../messageSchemas';
import { DEFAULT_YOUTUBE_SETTINGS } from '../storage';

describe('YouTubeSettingsSchema', () => {
  it('廃止済みキーが残った保存済みデータでも parse に成功し、そのキーは落ちる', () => {
    // 設定項目を削除したときに、削除前の保存済みデータで parse が落ちないことを守る。
    // 落ちると content script が既定値にフォールバックし、YouTube ブロックが
    // 無音で効かなくなる（#393 で「サイドバーを非表示」を削除した際の前提）
    const stored = {
      ...DEFAULT_YOUTUBE_SETTINGS,
      enabled: true,
      hideRecommendations: true,
      removedSettingKey: true
    };

    const parsed = YouTubeSettingsSchema.parse(stored);

    expect(parsed.hideRecommendations).toBe(true);
    expect(parsed).not.toHaveProperty('removedSettingKey');
  });
});
