import { describe, it, expect } from 'vitest';

import {
  TrackedSiteSchema,
  YouTubeFeaturesSchema,
  YouTubeSettingsInputSchema
} from '../messageSchemas';
import { blockedSite, trackedSite, youtubeFeatures } from '~/test/sites';

describe('YouTubeFeaturesSchema', () => {
  it('知らないキーが混ざっていても parse に成功し、そのキーは落ちる', () => {
    // content script は youtube.com の YouTube 機能をこの検証に通す。
    // 落ちると機能を使わない扱いになり、非表示が無音で効かなくなる
    const stored = {
      ...youtubeFeatures({ hideRecommendations: true }),
      removedSettingKey: true
    };

    const parsed = YouTubeFeaturesSchema.parse(stored);

    expect(parsed.hideRecommendations).toBe(true);
    expect(parsed).not.toHaveProperty('removedSettingKey');
  });
});

describe('TrackedSiteSchema', () => {
  it.each([
    ['追跡だけのサイト', trackedSite('x.com')],
    [
      'ブロック設定と YouTube 機能を持つサイト',
      blockedSite(
        'youtube.com',
        { timeLimit: { type: 'daily', limitSeconds: 600 } },
        { youtube: youtubeFeatures() }
      )
    ]
  ])('%s を受け付ける', (_label, site) => {
    expect(TrackedSiteSchema.parse(site)).toEqual(site);
  });

  it('block / youtube が欠けた形は拒む（null で明示する）', () => {
    const { block: _block, ...withoutBlock } = trackedSite('x.com');
    expect(TrackedSiteSchema.safeParse(withoutBlock).success).toBe(false);
  });
});

describe('YouTubeSettingsInputSchema', () => {
  it('時間制限は null を含めて必須', () => {
    const value = {
      enabled: true,
      blockAccess: true,
      hideShorts: false,
      hideRecommendations: false,
      hideComments: false,
      hideHomeFeed: false
    };
    expect(YouTubeSettingsInputSchema.safeParse(value).success).toBe(false);
    expect(
      YouTubeSettingsInputSchema.safeParse({ ...value, timeLimit: null })
        .success
    ).toBe(true);
  });
});
