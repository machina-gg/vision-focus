import { describe, it, expect } from 'vitest';

import {
  ImportSettingsBodySchema,
  ScheduleInputSchema,
  ScheduleSchema,
  SiteEntrySchema,
  YouTubeFeaturesSchema,
  YouTubeSettingsInputSchema
} from '../messageSchemas';
import { createDefaultExportData } from '~/lib/settingsExport';
import {
  allowedSite,
  blockedSite,
  trackedSite,
  youtubeFeatures
} from '~/test/sites';
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

describe('SiteEntrySchema', () => {
  it.each([
    ['規則なしのサイト', trackedSite('x.com')],
    [
      'ブロックの規則と YouTube 機能を持つサイト',
      blockedSite(
        'youtube.com',
        { timeLimit: { type: 'daily', limitSeconds: 600 } },
        { youtube: youtubeFeatures() }
      )
    ],
    ['許可サイト', allowedSite('music.youtube.com', true)]
  ])('%s を受け付ける', (_label, site) => {
    expect(SiteEntrySchema.parse(site)).toEqual(site);
  });

  it('rule / youtube が欠けた形は拒む（null で明示する）', () => {
    const { rule: _rule, ...withoutRule } = trackedSite('x.com');
    expect(SiteEntrySchema.safeParse(withoutRule).success).toBe(false);
  });

  it('旧形式の block を持つ形は拒む', () => {
    const { rule: _rule, ...rest } = blockedSite('x.com');
    const legacy = {
      ...rest,
      block: { enabled: true, addedAt: rest.trackedAt, timeLimit: null }
    };
    expect(SiteEntrySchema.safeParse(legacy).success).toBe(false);
  });

  it.each([
    ['kind の無いブロック', { enabled: true, addedAt: 'x', timeLimit: null }],
    ['recordTime の無い許可', { kind: 'allow' }],
    ['知らない kind', { kind: 'track' }]
  ])('規則が %s なら拒む', (_label, rule) => {
    expect(
      SiteEntrySchema.safeParse({ ...trackedSite('x.com'), rule }).success
    ).toBe(false);
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

describe('ScheduleSchema の名前と曜日', () => {
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
    ['前後に空白を含む名前', { name: ' Work ' }],
    ['日曜と土曜', { days: [0, 6] }],
    ['全曜日', { days: [0, 1, 2, 3, 4, 5, 6] }]
  ])('%s を受け付け、値を変えない', (_label, overrides) => {
    const value = { ...schedule, ...overrides };
    expect(ScheduleSchema.parse(value)).toEqual(value);
  });

  it.each([
    ['名前が空', { name: '' }],
    ['名前が空白だけ', { name: ' \t　' }],
    ['曜日が無い', { days: [] }],
    ['曜日が負', { days: [-1] }],
    ['曜日が 7', { days: [7] }],
    ['曜日が整数でない', { days: [1.5] }],
    ['曜日が重複', { days: [1, 2, 1] }]
  ])('%s なら拒む（取り込みも拒む）', (_label, overrides) => {
    expect(
      ScheduleSchema.safeParse({ ...schedule, ...overrides }).success
    ).toBe(false);
    expect(
      ImportSettingsBodySchema.safeParse(importBody(overrides)).success
    ).toBe(false);
  });
});

describe('ScheduleInputSchema', () => {
  it('id と enabled を持たない入力値を受け付け、渡されても落とす', () => {
    const input = {
      name: 'Work',
      startTime: '09:00',
      endTime: '17:00',
      days: [1],
      presetId: 'p1'
    };

    expect(ScheduleInputSchema.parse(input)).toEqual(input);
    expect(
      ScheduleInputSchema.parse({ ...input, id: 'x', enabled: false })
    ).toEqual(input);
  });

  it('保存値と同じ条件で曜日なしを拒む', () => {
    expect(
      ScheduleInputSchema.safeParse({
        name: 'Work',
        startTime: '09:00',
        endTime: '17:00',
        days: []
      }).success
    ).toBe(false);
  });
});
