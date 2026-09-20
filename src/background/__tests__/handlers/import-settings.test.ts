import { describe, expect, it, vi, beforeEach } from 'vitest';

import { invoke } from './helpers';

vi.mock('~/lib/storage', () => ({
  getSettings: vi.fn(),
  setSettings: vi.fn()
}));

vi.mock('~/lib/blockService', () => ({
  getActiveBlockedDomains: vi.fn()
}));

vi.mock('../../blocker', () => ({
  updateBlockRules: vi.fn(),
  blockExistingTabs: vi.fn()
}));

import { getSettings, setSettings } from '~/lib/storage';
import { getActiveBlockedDomains } from '~/lib/blockService';
import { updateBlockRules, blockExistingTabs } from '../../blocker';
import { importSettingsHandler as handler } from '../../handlers/import-settings';
import { DEFAULT_SETTINGS } from '~/types/storage';
import type { AppSettings, BlockItem } from '~/types/storage';

interface Response {
  success: boolean;
  error?: string;
}

const blockItem = (overrides: Partial<BlockItem> = {}): BlockItem => ({
  id: 'block-1',
  domain: 'example.com',
  isWildcard: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  enabled: true,
  ...overrides
});

/** 画面側が applyImportedSettings で組み立てた「適用後の設定」に相当する値 */
const importedSettings = (
  overrides: Partial<AppSettings> = {}
): AppSettings => ({
  ...DEFAULT_SETTINGS,
  blockList: [blockItem()],
  ...overrides
});

/**
 * 保存前後のブロック対象を決める。
 *
 * ハンドラは getActiveBlockedDomains() を保存前・保存後の順で呼ぶ
 */
function givenBlockedDomains(before: string[], after: string[]) {
  vi.mocked(getActiveBlockedDomains)
    // 既に積んである戻り値（beforeEach の既定）を捨ててから積み直す
    .mockReset()
    .mockResolvedValueOnce(before)
    .mockResolvedValueOnce(after);
}

describe('import-settings ハンドラ', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSettings).mockResolvedValue(DEFAULT_SETTINGS);
    givenBlockedDomains([], []);
  });

  describe('入力検証', () => {
    it.each([
      ['body が空', {}],
      ['settings が null', { settings: null }],
      ['blockList が無い', { settings: { schedules: [] } }],
      ['schedules が無い', { settings: { blockList: [] } }],
      [
        'blockList の項目が不正',
        { settings: { blockList: [{ domain: 'example.com' }], schedules: [] } }
      ],
      [
        'schedules の項目が不正',
        { settings: { blockList: [], schedules: [{ id: 'a' }] } }
      ],
      [
        'paused が boolean でない',
        { settings: { blockList: [], schedules: [], paused: 'yes' } }
      ]
    ])('%s なら Invalid request body を返す', async (_label, body) => {
      const result = await invoke<Response>(handler, body);

      expect(result).toEqual({
        success: false,
        error: 'Invalid request body'
      });
      expect(setSettings).not.toHaveBeenCalled();
      expect(updateBlockRules).not.toHaveBeenCalled();
      expect(blockExistingTabs).not.toHaveBeenCalled();
    });
  });

  it('インポートした設定を保存してブロックルールを更新する', async () => {
    const settings = importedSettings({
      blockList: [blockItem({ domain: 'sns.example' })],
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

    const result = await invoke<Response>(handler, { settings });

    expect(result).toEqual({ success: true });
    expect(setSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        blockList: [expect.objectContaining({ domain: 'sns.example' })],
        schedules: [expect.objectContaining({ id: 'schedule-1' })]
      })
    );
    expect(updateBlockRules).toHaveBeenCalledOnce();
  });

  it('enabled を持たない項目は有効として保存する', async () => {
    const { enabled: _enabled, ...withoutEnabled } = blockItem();

    await invoke(handler, {
      settings: { ...importedSettings(), blockList: [withoutEnabled] }
    });

    expect(setSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        blockList: [expect.objectContaining({ enabled: true })]
      })
    );
  });

  it('検証の対象にしていない項目も落とさずに保存する', async () => {
    await invoke(handler, {
      settings: { ...importedSettings(), futureSetting: 'keep me' }
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

    await invoke(handler, {
      settings: { blockList: [blockItem()], schedules: [] }
    });

    expect(setSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        password: { enabled: true, passwordHash: 'hash' }
      })
    );
  });

  describe('既存タブをブロックする条件', () => {
    it('ブロック対象のドメインが増えたとき', async () => {
      givenBlockedDomains([], ['example.com']);

      await invoke(handler, { settings: importedSettings() });

      expect(blockExistingTabs).toHaveBeenCalledOnce();
    });

    it('元からあった対象に加えて別の対象が増えたとき', async () => {
      givenBlockedDomains(['example.com'], ['example.com', 'sns.example']);

      await invoke(handler, { settings: importedSettings() });

      expect(blockExistingTabs).toHaveBeenCalledOnce();
    });
  });

  describe('既存タブをブロックしない条件', () => {
    it('ブロック対象が変わらないとき', async () => {
      givenBlockedDomains(['example.com'], ['example.com']);

      await invoke(handler, { settings: importedSettings() });

      expect(updateBlockRules).toHaveBeenCalledOnce();
      expect(blockExistingTabs).not.toHaveBeenCalled();
    });

    it('ブロック対象が減ったとき', async () => {
      givenBlockedDomains(['example.com', 'sns.example'], ['example.com']);

      await invoke(handler, { settings: importedSettings() });

      expect(blockExistingTabs).not.toHaveBeenCalled();
    });
  });

  it('保存に失敗した場合はエラーを返す（例外を外に投げない）', async () => {
    vi.mocked(setSettings).mockRejectedValue(new Error('storage full'));

    const result = await invoke<Response>(handler, {
      settings: importedSettings()
    });

    expect(result).toEqual({
      success: false,
      error: 'Failed to import settings'
    });
    expect(blockExistingTabs).not.toHaveBeenCalled();
  });

  it('ブロックルールの更新に失敗した場合もエラーを返す', async () => {
    vi.mocked(updateBlockRules).mockRejectedValue(new Error('rules failed'));

    const result = await invoke<Response>(handler, {
      settings: importedSettings()
    });

    expect(result).toEqual({
      success: false,
      error: 'Failed to import settings'
    });
    expect(blockExistingTabs).not.toHaveBeenCalled();
  });
});
