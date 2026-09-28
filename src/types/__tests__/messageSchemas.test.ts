import { describe, it, expect } from 'vitest';

import {
  ImportSettingsBodySchema,
  ScheduleSchema,
  TrackedSiteSchema,
  YouTubeFeaturesSchema,
  YouTubeSettingsInputSchema
} from '../messageSchemas';
import { createDefaultExportData } from '~/lib/settingsExport';
import { blockedSite, trackedSite, youtubeFeatures } from '~/test/sites';
import type { Schedule } from '~/types/storage';

describe('YouTubeFeaturesSchema', () => {
  it('知らないキーが混ざっていても parse に成功し、そのキーは落ちる', () => {
    // content script は youtube.com の YouTube 機能をこの検証に通すため、落ちると非表示が無音で効かなくなる
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

describe('ScheduleSchema の時刻', () => {
  const schedule: Schedule = {
    id: 's1',
    name: 'Work',
    startTime: '09:00',
    endTime: '17:00',
    days: [1],
    enabled: true
  };

  function importBody(overrides: Partial<Schedule>) {
    return {
      data: {
        ...createDefaultExportData().data,
        schedules: [{ ...schedule, ...overrides }]
      }
    };
  }

  it.each([
    ['00:00', '23:59'],
    ['23:59', '00:00'],
    ['00:00', '24:00'],
    ['09:30', '17:45']
  ])('開始 %s・終了 %s を受け付ける', (startTime, endTime) => {
    expect(
      ScheduleSchema.safeParse({ ...schedule, startTime, endTime }).success
    ).toBe(true);
    expect(
      ImportSettingsBodySchema.safeParse(importBody({ startTime, endTime }))
        .success
    ).toBe(true);
  });

  const invalidTimes = [
    ['範囲外の時', '24:01'],
    ['範囲外の時', '25:00'],
    ['範囲外の分', '12:60'],
    ['時が 1 桁', '9:00'],
    ['分が 1 桁', '12:3'],
    ['秒つき', '12:30:00'],
    ['区切りが違う', '12-30'],
    ['数字でない', 'abc'],
    ['空文字', '']
  ];

  it.each(invalidTimes)('開始時刻が%s（%s）なら拒む', (_label, startTime) => {
    expect(ScheduleSchema.safeParse({ ...schedule, startTime }).success).toBe(
      false
    );
    expect(
      ImportSettingsBodySchema.safeParse(importBody({ startTime })).success
    ).toBe(false);
  });

  it.each(invalidTimes)('終了時刻が%s（%s）なら拒む', (_label, endTime) => {
    expect(ScheduleSchema.safeParse({ ...schedule, endTime }).success).toBe(
      false
    );
    expect(
      ImportSettingsBodySchema.safeParse(importBody({ endTime })).success
    ).toBe(false);
  });

  it('開始時刻の 24:00 は拒む', () => {
    expect(
      ScheduleSchema.safeParse({ ...schedule, startTime: '24:00' }).success
    ).toBe(false);
  });
});
