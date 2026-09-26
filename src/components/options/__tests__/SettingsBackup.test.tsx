import React from 'react';

import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { SettingsBackup } from '../SettingsBackup';
import {
  EXPORT_STATUS_DELAY_MS,
  SHARE_MESSAGE_DELAY_MS
} from '~/constants/intervals';
import { DEFAULT_SETTINGS, DEFAULT_VISION } from '~/types/storage';
import { blockedSite, sitesOf } from '~/test/sites';

const IMPORTED_SITES = sitesOf(blockedSite('example.com'));

const settingsExport = vi.hoisted(() => ({
  exportSettings: vi.fn(),
  downloadSettings: vi.fn(),
  readFileAsString: vi.fn(),
  validateImportedData: vi.fn(),
  applyImportedSettings: vi.fn()
}));

const storage = vi.hoisted(() => ({
  getSettings: vi.fn(),
  getSites: vi.fn(),
  getVision: vi.fn(),
  setVision: vi.fn()
}));

const messaging = vi.hoisted(() => ({
  sendMessage: vi.fn()
}));

vi.mock('~/lib/settingsExport', () => settingsExport);
vi.mock('~/lib/storage', () => storage);
vi.mock('~/lib/messaging', () => messaging);

const jsonFile = () =>
  new File(['{}'], 'visionfocus-settings.json', { type: 'application/json' });

const exportButton = () => screen.getByTestId('settings-export-button');
const importInput = () => screen.getByTestId('settings-import-input');

async function importFile(file: File = jsonFile()) {
  await act(async () => {
    fireEvent.change(importInput(), { target: { files: [file] } });
  });
}

beforeEach(() => {
  settingsExport.exportSettings
    .mockReset()
    .mockReturnValue({ data: { version: 1 }, isLarge: false });
  settingsExport.downloadSettings.mockReset();
  settingsExport.readFileAsString.mockReset().mockResolvedValue('{}');
  settingsExport.validateImportedData
    .mockReset()
    .mockReturnValue({ success: true, data: { sites: IMPORTED_SITES } });
  settingsExport.applyImportedSettings.mockReset().mockReturnValue({
    settings: DEFAULT_SETTINGS,
    vision: DEFAULT_VISION
  });
  storage.getSettings.mockReset().mockResolvedValue(DEFAULT_SETTINGS);
  storage.getSites.mockReset().mockResolvedValue(IMPORTED_SITES);
  storage.getVision.mockReset().mockResolvedValue(DEFAULT_VISION);
  storage.setVision.mockReset().mockResolvedValue(undefined);
  messaging.sendMessage.mockReset().mockResolvedValue({ success: true });
});

describe('SettingsBackup', () => {
  describe('初期表示', () => {
    it('エクスポートとインポートの見出しを出す', () => {
      render(<SettingsBackup />);

      expect(screen.getByText('settingsBackup')).toBeInTheDocument();
      expect(exportButton()).toHaveTextContent('exportSettings');
      expect(screen.getByTestId('settings-import-button')).toHaveTextContent(
        'selectFile'
      );
    });

    it('警告も結果も出ていない', () => {
      render(<SettingsBackup />);

      expect(screen.queryByText('exportLargeWarning')).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('import-result-message')
      ).not.toBeInTheDocument();
    });
  });

  describe('エクスポート', () => {
    it('現在の設定・スタイル・追跡中のサイトを渡して書き出す', async () => {
      const data = { version: 1 };
      settingsExport.exportSettings.mockReturnValue({ data, isLarge: false });
      render(<SettingsBackup />);

      await act(async () => {
        fireEvent.click(exportButton());
      });

      expect(settingsExport.exportSettings).toHaveBeenCalledWith(
        DEFAULT_SETTINGS,
        DEFAULT_VISION,
        IMPORTED_SITES
      );
      expect(settingsExport.downloadSettings).toHaveBeenCalledWith(data);
      expect(exportButton()).toHaveTextContent('saved');
    });

    it('サイズが大きいときだけ警告を出す', async () => {
      settingsExport.exportSettings.mockReturnValue({
        data: { version: 1 },
        isLarge: true
      });
      render(<SettingsBackup />);

      await act(async () => {
        fireEvent.click(exportButton());
      });

      expect(screen.getByText('exportLargeWarning')).toBeInTheDocument();
    });

    it('失敗したら成功表示を出さない', async () => {
      storage.getSettings.mockRejectedValue(new Error('storage error'));
      render(<SettingsBackup />);

      await act(async () => {
        fireEvent.click(exportButton());
      });

      expect(settingsExport.downloadSettings).not.toHaveBeenCalled();
      expect(exportButton()).not.toHaveTextContent('saved');
    });
  });

  describe('インポートの開始', () => {
    it('ボタンを押すとファイル選択欄が開く', () => {
      const click = vi.spyOn(HTMLInputElement.prototype, 'click');
      render(<SettingsBackup />);

      fireEvent.click(screen.getByTestId('settings-import-button'));

      expect(click).toHaveBeenCalledTimes(1);
      click.mockRestore();
    });

    it('ファイルを選ばなかったときは何もしない', async () => {
      render(<SettingsBackup />);

      await act(async () => {
        fireEvent.change(importInput(), { target: { files: [] } });
      });

      expect(settingsExport.readFileAsString).not.toHaveBeenCalled();
    });
  });

  describe('インポートの成功', () => {
    it('background へ保存したあとスタイルを保存し、成功を伝える', async () => {
      const onSettingsChange = vi.fn();
      render(<SettingsBackup onSettingsChange={onSettingsChange} />);

      await importFile();

      expect(messaging.sendMessage).toHaveBeenCalledWith('import-settings', {
        settings: DEFAULT_SETTINGS,
        sites: Object.values(IMPORTED_SITES)
      });
      expect(storage.setVision).toHaveBeenCalledWith(DEFAULT_VISION);
      expect(screen.getByTestId('import-result-message')).toHaveTextContent(
        'importSuccessWithMerge'
      );
      expect(onSettingsChange).toHaveBeenCalledTimes(1);
    });

    it('入れ子で取り込まれなかったサイトを警告として並べる', async () => {
      messaging.sendMessage.mockResolvedValue({
        success: true,
        skipped: [{ domain: 'm.youtube.com', conflict: 'youtube.com' }]
      });
      render(<SettingsBackup />);

      await importFile();

      expect(screen.getByTestId('import-result-message')).toHaveTextContent(
        'importSuccessWithMerge'
      );
      expect(screen.getByText('importWarningNestedSite')).toBeInTheDocument();
    });

    it('onSettingsChange が未指定でも例外にならない', async () => {
      render(<SettingsBackup />);

      await importFile();

      expect(screen.getByTestId('import-result-message')).toHaveTextContent(
        'importSuccessWithMerge'
      );
    });

    it('検証が警告を返したら警告として並べる', async () => {
      settingsExport.validateImportedData.mockReturnValue({
        success: true,
        data: { sites: IMPORTED_SITES },
        warnings: ['importWarningOldVersion', 'importWarningUnknownField']
      });
      render(<SettingsBackup />);

      await importFile();

      expect(screen.getByText('importWarningOldVersion')).toBeInTheDocument();
      expect(screen.getByText('importWarningUnknownField')).toBeInTheDocument();
    });

    it('警告が 0 件なら警告の欄を出さない', async () => {
      settingsExport.validateImportedData.mockReturnValue({
        success: true,
        data: { sites: IMPORTED_SITES },
        warnings: []
      });
      render(<SettingsBackup />);

      await importFile();

      expect(screen.getByTestId('import-result-message')).toHaveTextContent(
        'importSuccessWithMerge'
      );
    });
  });

  describe('インポートの失敗', () => {
    it('検証で弾かれたら理由を出し、保存へ進まない', async () => {
      settingsExport.validateImportedData.mockReturnValue({
        success: false,
        error: 'importErrorVersionMismatch'
      });
      render(<SettingsBackup />);

      await importFile();

      expect(screen.getByTestId('import-result-message')).toHaveTextContent(
        'importErrorVersionMismatch'
      );
      expect(messaging.sendMessage).not.toHaveBeenCalled();
      expect(storage.setVision).not.toHaveBeenCalled();
    });

    it('検証が理由を返さなければ既定の理由を出す', async () => {
      settingsExport.validateImportedData.mockReturnValue({ success: false });
      render(<SettingsBackup />);

      await importFile();

      expect(screen.getByTestId('import-result-message')).toHaveTextContent(
        'importErrorInvalidFormat'
      );
    });

    it('検証を通っても中身が無ければ失敗として扱う', async () => {
      settingsExport.validateImportedData.mockReturnValue({ success: true });
      render(<SettingsBackup />);

      await importFile();

      expect(screen.getByTestId('import-result-message')).toHaveTextContent(
        'importErrorInvalidFormat'
      );
      expect(storage.setVision).not.toHaveBeenCalled();
    });

    it('background への保存が失敗したらスタイルも書き換えない', async () => {
      messaging.sendMessage.mockResolvedValue({ success: false });
      const onSettingsChange = vi.fn();
      render(<SettingsBackup onSettingsChange={onSettingsChange} />);

      await importFile();

      expect(screen.getByTestId('import-result-message')).toHaveTextContent(
        'importErrorSaveFailed'
      );
      expect(storage.setVision).not.toHaveBeenCalled();
      expect(onSettingsChange).not.toHaveBeenCalled();
    });

    it('background からの応答が無くても失敗として扱う', async () => {
      messaging.sendMessage.mockResolvedValue(undefined);
      render(<SettingsBackup />);

      await importFile();

      expect(screen.getByTestId('import-result-message')).toHaveTextContent(
        'importErrorSaveFailed'
      );
      expect(storage.setVision).not.toHaveBeenCalled();
    });

    it('ファイルが読めなければ失敗として扱う', async () => {
      settingsExport.readFileAsString.mockRejectedValue(new Error('io error'));
      render(<SettingsBackup />);

      await importFile();

      expect(screen.getByTestId('import-result-message')).toHaveTextContent(
        'importErrorInvalidFormat'
      );
    });

    it('失敗しても同じファイルを選び直せるよう入力欄を空へ戻す', async () => {
      settingsExport.readFileAsString.mockRejectedValue(new Error('io error'));
      render(<SettingsBackup />);

      await importFile();

      expect(importInput()).toHaveValue('');
    });
  });

  describe('結果表示の自動リセット', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('エクスポートの成功表示は一定時間で元に戻る', async () => {
      settingsExport.exportSettings.mockReturnValue({
        data: { version: 1 },
        isLarge: true
      });
      render(<SettingsBackup />);

      await act(async () => {
        fireEvent.click(exportButton());
      });
      expect(exportButton()).toHaveTextContent('saved');

      await act(async () => {
        vi.advanceTimersByTime(EXPORT_STATUS_DELAY_MS);
      });

      expect(exportButton()).toHaveTextContent('exportSettings');
      expect(screen.queryByText('exportLargeWarning')).not.toBeInTheDocument();
    });

    it('インポートの失敗表示は警告ごと片付く', async () => {
      settingsExport.validateImportedData
        .mockReturnValueOnce({
          success: true,
          data: { sites: IMPORTED_SITES },
          warnings: ['importWarningOldVersion']
        })
        .mockReturnValue({ success: false, error: 'importErrorSaveFailed' });
      messaging.sendMessage.mockResolvedValue({ success: false });
      render(<SettingsBackup />);

      await importFile();
      expect(screen.getByText('importWarningOldVersion')).toBeInTheDocument();

      await act(async () => {
        vi.advanceTimersByTime(SHARE_MESSAGE_DELAY_MS);
      });

      expect(
        screen.queryByTestId('import-result-message')
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText('importWarningOldVersion')
      ).not.toBeInTheDocument();
    });
  });
});
