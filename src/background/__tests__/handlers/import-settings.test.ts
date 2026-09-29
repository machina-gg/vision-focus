import { describe, expect, it, vi, beforeEach } from 'vitest';

import { invoke } from './helpers';

vi.mock('~/lib/settingsService', () => ({
  importSettings: vi.fn()
}));

vi.mock('~/lib/siteService', () => ({
  importSites: vi.fn()
}));

vi.mock('~/lib/blockService', () => ({
  getActiveBlockedDomains: vi.fn()
}));

vi.mock('../../blocker', () => ({
  updateBlockRules: vi.fn(),
  blockExistingTabs: vi.fn()
}));

import { importSettings } from '~/lib/settingsService';
import { importSites } from '~/lib/siteService';
import { getActiveBlockedDomains } from '~/lib/blockService';
import { updateBlockRules, blockExistingTabs } from '../../blocker';
import { importSettingsHandler as handler } from '../../handlers/import-settings';
import { createDefaultExportData } from '~/lib/settingsExport';
import {
  blockedSite,
  sitesOf,
  trackedSite,
  youtubeFeatures
} from '~/test/sites';
import type { MessageError } from '~/types/messages';
import type { ExportedData } from '~/types/messageSchemas';
import { DEFAULT_DISPLAY_SETTINGS } from '~/types/storage';

interface Response {
  success: boolean;
  error?: MessageError;
  skipped?: { domain: string; conflict: string }[];
  skippedPresets?: string[];
  clearedActivePreset?: boolean;
  clearedSchedulePresets?: boolean;
}

const NOTHING_SKIPPED = {
  skippedPresets: [],
  clearedActivePreset: false,
  clearedSchedulePresets: false
};

const exportedData = (overrides: Partial<ExportedData> = {}): ExportedData => ({
  ...createDefaultExportData().data,
  ...overrides
});

function givenBlockedDomains(before: string[], after: string[]) {
  vi.mocked(getActiveBlockedDomains)
    .mockReset()
    .mockResolvedValueOnce(before)
    .mockResolvedValueOnce(after);
}

describe('import-settings ハンドラ', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(importSettings).mockResolvedValue(NOTHING_SKIPPED);
    vi.mocked(importSites).mockResolvedValue({ changed: [], skipped: [] });
    givenBlockedDomains([], []);
  });

  describe('入力検証', () => {
    const data = exportedData();
    it.each([
      ['body が空', {}],
      ['data が null', { data: null }],
      ['画面が重ねた設定の形（旧本文）', { settings: data, sites: [] }],
      ['sites が無い', { data: { ...data, sites: undefined } }],
      ['schedules が無い', { data: { ...data, schedules: undefined } }],
      [
        '追跡中のサイトの形が不正',
        {
          data: { ...data, sites: { 'example.com': { domain: 'example.com' } } }
        }
      ],
      [
        'schedules の項目が不正',
        { data: { ...data, schedules: [{ id: 'a' }] } }
      ],
      [
        '通知設定の分数が選択肢に無い',
        {
          data: {
            ...data,
            notifications: { timeLimitEnabled: true, timeLimitMinutes: 2 }
          }
        }
      ],
      [
        'スタイルのフォントが知らないもの',
        {
          data: {
            ...data,
            presets: [
              {
                ...data.defaultDisplaySettings,
                id: 'p1',
                name: 'p1',
                createdAt: 'x',
                fontSettings: { family: 'x', size: 'md', weight: 'bold' }
              }
            ]
          }
        }
      ],
      [
        '長押しの秒数が選択肢に無い',
        { data: { ...data, unblockConfirm: { holdSeconds: 15 } } }
      ]
    ])('%s なら invalid-request を返す', async (_label, body) => {
      const result = await invoke<Response>(handler, body);

      expect(result).toEqual({
        success: false,
        error: { code: 'invalid-request' }
      });
      expect(importSettings).not.toHaveBeenCalled();
      expect(importSites).not.toHaveBeenCalled();
      expect(updateBlockRules).not.toHaveBeenCalled();
      expect(blockExistingTabs).not.toHaveBeenCalled();
    });
  });

  it('設定ファイルの中身を設定に重ねて保存し、追跡中のサイトを取り込んでブロックルールを更新する', async () => {
    const schedules = [
      {
        id: 'schedule-1',
        name: 'work',
        startTime: '09:00',
        endTime: '18:00',
        days: [1, 2, 3, 4, 5],
        enabled: true
      }
    ];
    const sites = [
      blockedSite('sns.example', {
        timeLimit: { type: 'daily', limitSeconds: 600 }
      }),
      trackedSite('youtube.com', { youtube: youtubeFeatures() })
    ];
    const data = exportedData({ schedules, sites: sitesOf(...sites) });

    const result = await invoke<Response>(handler, { data });

    expect(result).toEqual({ success: true, skipped: [], ...NOTHING_SKIPPED });
    expect(importSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        schedules,
        notifications: data.notifications,
        unblockConfirm: data.unblockConfirm
      })
    );
    expect(importSites).toHaveBeenCalledWith(sites, expect.any(Date));
    expect(updateBlockRules).toHaveBeenCalledOnce();
  });

  it('入れ子で取り込まなかったサイトを返す', async () => {
    vi.mocked(importSites).mockResolvedValue({
      changed: [],
      skipped: [
        {
          input: 'm.youtube.com',
          nested: { site: 'youtube.com', relation: 'ancestor' }
        }
      ]
    });

    const result = await invoke<Response>(handler, {
      data: exportedData({ sites: sitesOf(blockedSite('m.youtube.com')) })
    });

    expect(result).toEqual({
      success: true,
      skipped: [{ domain: 'm.youtube.com', conflict: 'youtube.com' }],
      ...NOTHING_SKIPPED
    });
  });

  it('表示設定（スタイルの画像を含む）も重ねる側へ渡し、上限で取り込まなかったスタイルと外した参照を返す', async () => {
    const presets = [
      {
        ...DEFAULT_DISPLAY_SETTINGS,
        id: 'p1',
        name: 'Morning',
        createdAt: '2026-01-01T00:00:00.000Z',
        customBackgroundData: 'data:image/jpeg;base64,/9j/AAAA'
      }
    ];
    vi.mocked(importSettings).mockResolvedValue({
      skippedPresets: ['Morning'],
      clearedActivePreset: true,
      clearedSchedulePresets: false
    });
    const data = exportedData({ presets, activePresetId: 'p1' });

    const result = await invoke<Response>(handler, { data });

    expect(importSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        presets,
        activePresetId: 'p1',
        defaultDisplaySettings: data.defaultDisplaySettings
      })
    );
    expect(result).toEqual({
      success: true,
      skipped: [],
      skippedPresets: ['Morning'],
      clearedActivePreset: true,
      clearedSchedulePresets: false
    });
  });

  describe('既存タブをブロックする条件', () => {
    it('ブロック対象のドメインが増えたとき', async () => {
      givenBlockedDomains([], ['example.com']);

      await invoke(handler, { data: exportedData() });

      expect(blockExistingTabs).toHaveBeenCalledOnce();
    });

    it('元からあった対象に加えて別の対象が増えたとき', async () => {
      givenBlockedDomains(['example.com'], ['example.com', 'sns.example']);

      await invoke(handler, { data: exportedData() });

      expect(blockExistingTabs).toHaveBeenCalledOnce();
    });
  });

  describe('既存タブをブロックしない条件', () => {
    it('ブロック対象が変わらないとき', async () => {
      givenBlockedDomains(['example.com'], ['example.com']);

      await invoke(handler, { data: exportedData() });

      expect(updateBlockRules).toHaveBeenCalledOnce();
      expect(blockExistingTabs).not.toHaveBeenCalled();
    });

    it('ブロック対象が減ったとき', async () => {
      givenBlockedDomains(['example.com', 'sns.example'], ['example.com']);

      await invoke(handler, { data: exportedData() });

      expect(blockExistingTabs).not.toHaveBeenCalled();
    });
  });

  it('保存に失敗した場合はエラーを返す（例外を外に投げない）', async () => {
    vi.mocked(importSettings).mockRejectedValue(new Error('storage full'));

    const result = await invoke<Response>(handler, { data: exportedData() });

    expect(result).toEqual({
      success: false,
      error: { code: 'save-failed' }
    });
    expect(blockExistingTabs).not.toHaveBeenCalled();
  });

  it('ブロックルールの更新に失敗した場合もエラーを返す', async () => {
    vi.mocked(updateBlockRules).mockRejectedValue(new Error('rules failed'));

    const result = await invoke<Response>(handler, { data: exportedData() });

    expect(result).toEqual({
      success: false,
      error: { code: 'save-failed' }
    });
    expect(blockExistingTabs).not.toHaveBeenCalled();
  });
});
