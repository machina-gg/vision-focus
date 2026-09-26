import { describe, expect, it, vi, beforeEach } from 'vitest';

import { invoke } from './helpers';

vi.mock('~/lib/storage', () => ({
  getSettings: vi.fn(),
  setSettings: vi.fn()
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

import { getSettings, setSettings } from '~/lib/storage';
import { importSites } from '~/lib/siteService';
import { getActiveBlockedDomains } from '~/lib/blockService';
import { updateBlockRules, blockExistingTabs } from '../../blocker';
import { importSettingsHandler as handler } from '../../handlers/import-settings';
import { blockedSite, trackedSite, youtubeFeatures } from '~/test/sites';
import { DEFAULT_SETTINGS } from '~/types/storage';
import type { AppSettings } from '~/types/storage';
import type { MessageError } from '~/types/messages';

interface Response {
  success: boolean;
  error?: MessageError;
  skipped?: { domain: string; conflict: string }[];
}

const importedSettings = (
  overrides: Partial<AppSettings> = {}
): AppSettings => ({
  ...DEFAULT_SETTINGS,
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
    vi.mocked(getSettings).mockResolvedValue(DEFAULT_SETTINGS);
    vi.mocked(importSites).mockResolvedValue({ changed: [], skipped: [] });
    givenBlockedDomains([], []);
  });

  describe('入力検証', () => {
    const settings = importedSettings();
    it.each([
      ['body が空', {}],
      ['settings が null', { settings: null, sites: [] }],
      ['sites が無い', { settings }],
      [
        'schedules が無い',
        { settings: { ...settings, schedules: undefined }, sites: [] }
      ],
      [
        '追跡中のサイトの形が不正',
        { settings, sites: [{ domain: 'example.com' }] }
      ],
      [
        'schedules の項目が不正',
        { settings: { ...settings, schedules: [{ id: 'a' }] }, sites: [] }
      ],
      [
        'paused が boolean でない',
        { settings: { ...settings, paused: 'yes' }, sites: [] }
      ]
    ])('%s なら invalid-request を返す', async (_label, body) => {
      const result = await invoke<Response>(handler, body);

      expect(result).toEqual({
        success: false,
        error: { code: 'invalid-request' }
      });
      expect(setSettings).not.toHaveBeenCalled();
      expect(importSites).not.toHaveBeenCalled();
      expect(updateBlockRules).not.toHaveBeenCalled();
      expect(blockExistingTabs).not.toHaveBeenCalled();
    });
  });

  it('全体の設定を保存し、追跡中のサイトを取り込んでブロックルールを更新する', async () => {
    const settings = importedSettings({
      schedules: [
        {
          id: 'schedule-1',
          name: 'work',
          startTime: '09:00',
          endTime: '18:00',
          days: [1, 2, 3, 4, 5],
          enabled: true
        }
      ]
    });
    const sites = [
      blockedSite('sns.example', {
        timeLimit: { type: 'daily', limitSeconds: 600 }
      }),
      trackedSite('youtube.com', { youtube: youtubeFeatures() })
    ];

    const result = await invoke<Response>(handler, { settings, sites });

    expect(result).toEqual({ success: true, skipped: [] });
    expect(setSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        schedules: [expect.objectContaining({ id: 'schedule-1' })]
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
      settings: importedSettings(),
      sites: [blockedSite('m.youtube.com')]
    });

    expect(result).toEqual({
      success: true,
      skipped: [{ domain: 'm.youtube.com', conflict: 'youtube.com' }]
    });
  });

  it('検証の対象にしていない項目も落とさずに保存する', async () => {
    await invoke(handler, {
      settings: { ...importedSettings(), futureSetting: 'keep me' },
      sites: []
    });

    expect(setSettings).toHaveBeenCalledWith(
      expect.objectContaining({ futureSetting: 'keep me' })
    );
  });

  it('保存済みの設定のうち、インポートが触れない項目は残す', async () => {
    vi.mocked(getSettings).mockResolvedValue({
      ...DEFAULT_SETTINGS,
      password: { enabled: true, passwordHash: 'hash' }
    });
    const { password: _password, ...withoutPassword } = importedSettings();

    await invoke(handler, { settings: withoutPassword, sites: [] });

    expect(setSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        password: { enabled: true, passwordHash: 'hash' }
      })
    );
  });

  describe('既存タブをブロックする条件', () => {
    it('ブロック対象のドメインが増えたとき', async () => {
      givenBlockedDomains([], ['example.com']);

      await invoke(handler, { settings: importedSettings(), sites: [] });

      expect(blockExistingTabs).toHaveBeenCalledOnce();
    });

    it('元からあった対象に加えて別の対象が増えたとき', async () => {
      givenBlockedDomains(['example.com'], ['example.com', 'sns.example']);

      await invoke(handler, { settings: importedSettings(), sites: [] });

      expect(blockExistingTabs).toHaveBeenCalledOnce();
    });
  });

  describe('既存タブをブロックしない条件', () => {
    it('ブロック対象が変わらないとき', async () => {
      givenBlockedDomains(['example.com'], ['example.com']);

      await invoke(handler, { settings: importedSettings(), sites: [] });

      expect(updateBlockRules).toHaveBeenCalledOnce();
      expect(blockExistingTabs).not.toHaveBeenCalled();
    });

    it('ブロック対象が減ったとき', async () => {
      givenBlockedDomains(['example.com', 'sns.example'], ['example.com']);

      await invoke(handler, { settings: importedSettings(), sites: [] });

      expect(blockExistingTabs).not.toHaveBeenCalled();
    });
  });

  it('保存に失敗した場合はエラーを返す（例外を外に投げない）', async () => {
    vi.mocked(setSettings).mockRejectedValue(new Error('storage full'));

    const result = await invoke<Response>(handler, {
      settings: importedSettings(),
      sites: []
    });

    expect(result).toEqual({
      success: false,
      error: { code: 'save-failed' }
    });
    expect(blockExistingTabs).not.toHaveBeenCalled();
  });

  it('ブロックルールの更新に失敗した場合もエラーを返す', async () => {
    vi.mocked(setSettings).mockResolvedValue(undefined);
    vi.mocked(updateBlockRules).mockRejectedValue(new Error('rules failed'));

    const result = await invoke<Response>(handler, {
      settings: importedSettings(),
      sites: []
    });

    expect(result).toEqual({
      success: false,
      error: { code: 'save-failed' }
    });
    expect(blockExistingTabs).not.toHaveBeenCalled();
  });
});
