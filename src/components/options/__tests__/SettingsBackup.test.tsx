import React from 'react';

import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { SettingsBackup } from '../SettingsBackup';
import {
  EXPORT_STATUS_DELAY_MS,
  SHARE_MESSAGE_DELAY_MS
} from '~/constants/intervals';
import { MAX_PRESETS } from '~/constants/limits';
import {
  DEFAULT_DISPLAY_SETTINGS,
  DEFAULT_SETTINGS,
  DEFAULT_VISION,
  type DashboardPreset
} from '~/types/storage';
import { stubI18nWithSubstitutions } from '~/test/i18n';
import { blockedSite, sitesOf } from '~/test/sites';

const IMPORTED_SITES = sitesOf(blockedSite('example.com'));

const presetOf = (id: string): DashboardPreset => ({
  ...DEFAULT_DISPLAY_SETTINGS,
  id,
  name: id,
  createdAt: '2026-01-01T00:00:00.000Z',
  customBackgroundId: null
});

const settingsExport = vi.hoisted(() => ({
  exportSettings: vi.fn(),
  downloadSettings: vi.fn(),
  readFileAsString: vi.fn(),
  validateImportedData: vi.fn()
}));

const storage = vi.hoisted(() => ({
  getBackgroundImages: vi.fn(),
  getSettings: vi.fn(),
  getSites: vi.fn(),
  getVision: vi.fn(),
  settingsItem: { setValue: vi.fn() },
  visionItem: { setValue: vi.fn() }
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

async function chooseFile(file: File = jsonFile()) {
  await act(async () => {
    fireEvent.change(importInput(), { target: { files: [file] } });
  });
}

async function confirmImport() {
  await act(async () => {
    fireEvent.click(screen.getByTestId('import-confirm-submit'));
  });
}

async function importFile(file: File = jsonFile()) {
  await chooseFile(file);
  await confirmImport();
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
  storage.getSettings.mockReset().mockResolvedValue(DEFAULT_SETTINGS);
  storage.getSites.mockReset().mockResolvedValue(IMPORTED_SITES);
  storage.getVision.mockReset().mockResolvedValue(DEFAULT_VISION);
  storage.getBackgroundImages.mockReset().mockResolvedValue({});
  storage.settingsItem.setValue.mockReset();
  storage.visionItem.setValue.mockReset();
  messaging.sendMessage.mockReset().mockResolvedValue({ success: true });
});

describe('SettingsBackup', () => {
  describe('初期表示', () => {
    it('エクスポートとインポートの見出しを出す', () => {
      render(<SettingsBackup isPasswordProtected={false} />);

      expect(screen.getByText('settingsBackup')).toBeInTheDocument();
      expect(exportButton()).toHaveTextContent('exportSettings');
      expect(screen.getByTestId('settings-import-button')).toHaveTextContent(
        'selectFile'
      );
    });

    it('警告も結果も出ていない', () => {
      render(<SettingsBackup isPasswordProtected={false} />);

      expect(screen.queryByText('exportLargeWarning')).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('import-result-message')
      ).not.toBeInTheDocument();
    });
  });

  describe('エクスポート', () => {
    it('現在の設定・スタイル・追跡中のサイトと、スタイルの画像を渡して書き出す', async () => {
      const data = { version: 1 };
      const vision = {
        ...DEFAULT_VISION,
        presets: [
          { ...presetOf('p1'), customBackgroundId: 'img-1' },
          presetOf('p2')
        ]
      };
      const images = { 'img-1': 'data:image/jpeg;base64,AAAA' };
      storage.getVision.mockResolvedValue(vision);
      storage.getBackgroundImages.mockResolvedValue(images);
      settingsExport.exportSettings.mockReturnValue({ data, isLarge: false });
      render(<SettingsBackup isPasswordProtected={false} />);

      await act(async () => {
        fireEvent.click(exportButton());
      });

      expect(storage.getBackgroundImages).toHaveBeenCalledWith(['img-1']);
      expect(settingsExport.exportSettings).toHaveBeenCalledWith(
        DEFAULT_SETTINGS,
        vision,
        IMPORTED_SITES,
        images
      );
      expect(settingsExport.downloadSettings).toHaveBeenCalledWith(data);
      expect(exportButton()).toHaveTextContent('saved');
    });

    it('サイズが大きいときだけ警告を出す', async () => {
      settingsExport.exportSettings.mockReturnValue({
        data: { version: 1 },
        isLarge: true
      });
      render(<SettingsBackup isPasswordProtected={false} />);

      await act(async () => {
        fireEvent.click(exportButton());
      });

      expect(screen.getByText('exportLargeWarning')).toBeInTheDocument();
    });

    it('失敗したら成功表示を出さない', async () => {
      storage.getSettings.mockRejectedValue(new Error('storage error'));
      render(<SettingsBackup isPasswordProtected={false} />);

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
      render(<SettingsBackup isPasswordProtected={false} />);

      fireEvent.click(screen.getByTestId('settings-import-button'));

      expect(click).toHaveBeenCalledTimes(1);
      click.mockRestore();
    });

    it('ファイルを選ばなかったときは何もしない', async () => {
      render(<SettingsBackup isPasswordProtected={false} />);

      await act(async () => {
        fireEvent.change(importInput(), { target: { files: [] } });
      });

      expect(settingsExport.readFileAsString).not.toHaveBeenCalled();
    });
  });

  describe('取り込み前の確認', () => {
    it('ファイルを選んだら上書きの確認を出し、確認するまで background へ送らない', async () => {
      render(<SettingsBackup isPasswordProtected={false} />);

      await chooseFile();

      expect(screen.getByTestId('import-confirm-message')).toHaveTextContent(
        'importConfirmMessage'
      );
      expect(messaging.sendMessage).not.toHaveBeenCalled();
    });

    it('キャンセルしたら background へ送らず、結果も出さずに元へ戻る', async () => {
      render(<SettingsBackup isPasswordProtected={false} />);

      await chooseFile();
      fireEvent.click(screen.getByTestId('import-confirm-cancel'));

      expect(messaging.sendMessage).not.toHaveBeenCalled();
      expect(
        screen.queryByTestId('import-confirm-message')
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('import-result-message')
      ).not.toBeInTheDocument();
      expect(screen.getByTestId('settings-import-button')).toHaveTextContent(
        'selectFile'
      );
    });

    it('検証で弾いたファイルでは確認を出さない', async () => {
      settingsExport.validateImportedData.mockReturnValue({
        success: false,
        error: 'importErrorInvalidFormat'
      });
      render(<SettingsBackup isPasswordProtected={false} />);

      await chooseFile();

      expect(
        screen.queryByTestId('import-confirm-message')
      ).not.toBeInTheDocument();
    });

    it('パスワード保護がなければパスワード欄を出さない', async () => {
      render(<SettingsBackup isPasswordProtected={false} />);

      await chooseFile();

      expect(
        screen.queryByTestId('password-field-import')
      ).not.toBeInTheDocument();
    });
  });

  describe('パスワード保護中の取り込み', () => {
    async function importWithPassword(password: string) {
      await chooseFile();
      fireEvent.change(screen.getByTestId('password-field-import'), {
        target: { value: password }
      });
      await confirmImport();
    }

    it('確認の中でパスワードを入力させ、添えて background へ送る', async () => {
      render(<SettingsBackup isPasswordProtected />);

      await importWithPassword('secret');

      expect(messaging.sendMessage).toHaveBeenCalledWith('import-settings', {
        data: { sites: IMPORTED_SITES },
        password: 'secret'
      });
      expect(screen.getByTestId('import-result-message')).toHaveTextContent(
        'importSuccess'
      );
    });

    it('パスワードが違えば理由を出し、確認を閉じない', async () => {
      messaging.sendMessage.mockResolvedValue({
        success: false,
        error: { code: 'password-mismatch' }
      });
      render(<SettingsBackup isPasswordProtected />);

      await importWithPassword('wrong');

      expect(screen.getByTestId('import-confirm-error')).toHaveTextContent(
        'passwordIncorrect'
      );
      expect(screen.getByTestId('import-confirm-message')).toBeInTheDocument();
      expect(
        screen.queryByTestId('import-result-message')
      ).not.toBeInTheDocument();
    });

    it('パスワードが添えられていないと返されたら理由を出し、確認を閉じない', async () => {
      messaging.sendMessage.mockResolvedValue({
        success: false,
        error: { code: 'password-required' }
      });
      render(<SettingsBackup isPasswordProtected />);

      await importWithPassword('secret');

      expect(screen.getByTestId('import-confirm-error')).toHaveTextContent(
        'passwordRequired'
      );
      expect(screen.getByTestId('import-confirm-message')).toBeInTheDocument();
    });
  });

  describe('インポートの成功', () => {
    it('確認のあとで設定ファイルの中身を background へ送り、成功を伝える（画面は設定を読み直さず、保存領域に書かない）', async () => {
      render(<SettingsBackup isPasswordProtected={false} />);

      await importFile();

      expect(messaging.sendMessage).toHaveBeenCalledWith('import-settings', {
        data: { sites: IMPORTED_SITES },
        password: undefined
      });
      expect(screen.getByTestId('import-result-message')).toHaveTextContent(
        'importSuccess'
      );
      expect(
        screen.queryByTestId('import-confirm-message')
      ).not.toBeInTheDocument();
      expect(storage.getSettings).not.toHaveBeenCalled();
      expect(storage.getVision).not.toHaveBeenCalled();
      expect(storage.settingsItem.setValue).not.toHaveBeenCalled();
      expect(storage.visionItem.setValue).not.toHaveBeenCalled();
    });

    it('取り込まなかったスタイルへの参照を外したら既存の警告を出し、検証の警告と重ねて出さない', async () => {
      settingsExport.validateImportedData.mockReturnValue({
        success: true,
        data: { sites: IMPORTED_SITES },
        warnings: ['importWarningOrphanedPresets']
      });
      messaging.sendMessage.mockResolvedValue({
        success: true,
        skippedPresets: ['Morning'],
        clearedActivePreset: true,
        clearedSchedulePresets: true
      });
      render(<SettingsBackup isPasswordProtected={false} />);

      await importFile();

      expect(screen.getAllByText('importWarningOrphanedPresets')).toHaveLength(
        1
      );
      expect(
        screen.getByText('importWarningActivePresetNotFound')
      ).toBeInTheDocument();
    });

    it('スタイルを取り込み切れたら上限の警告を出さない', async () => {
      messaging.sendMessage.mockResolvedValue({
        success: true,
        skippedPresets: [],
        clearedActivePreset: false,
        clearedSchedulePresets: false
      });
      render(<SettingsBackup isPasswordProtected={false} />);

      await importFile();

      expect(
        screen.queryByText(/^importWarningPresetLimit/)
      ).not.toBeInTheDocument();
    });

    it('検証が警告を返したら警告として並べる', async () => {
      settingsExport.validateImportedData.mockReturnValue({
        success: true,
        data: { sites: IMPORTED_SITES },
        warnings: ['importWarningOldVersion', 'importWarningUnknownField']
      });
      render(<SettingsBackup isPasswordProtected={false} />);

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
      render(<SettingsBackup isPasswordProtected={false} />);

      await importFile();

      expect(screen.getByTestId('import-result-message')).toHaveTextContent(
        'importSuccess'
      );
    });
  });

  describe('上限で取り込まれなかったスタイル', () => {
    stubI18nWithSubstitutions();

    it('上限の件数と名前を添えた警告にする', async () => {
      messaging.sendMessage.mockResolvedValue({
        success: true,
        skippedPresets: ['Morning', 'Night'],
        clearedActivePreset: false,
        clearedSchedulePresets: false
      });
      render(<SettingsBackup isPasswordProtected={false} />);

      await importFile();

      expect(
        screen.getByText(
          `importWarningPresetLimit(${MAX_PRESETS},Morning, Night)`
        )
      ).toBeInTheDocument();
    });
  });

  describe('インポートの失敗', () => {
    stubI18nWithSubstitutions();

    it('検証で弾かれたら理由を出し、保存へ進まない', async () => {
      settingsExport.validateImportedData.mockReturnValue({
        success: false,
        error: 'importErrorVersionMismatch'
      });
      render(<SettingsBackup isPasswordProtected={false} />);

      await chooseFile();

      expect(screen.getByTestId('import-result-message')).toHaveTextContent(
        'importErrorVersionMismatch'
      );
      expect(messaging.sendMessage).not.toHaveBeenCalled();
    });

    it('理由に差し込む値があれば文言に差し込む', async () => {
      settingsExport.validateImportedData.mockReturnValue({
        success: false,
        error: 'importErrorFileTooLarge',
        errorSubstitutions: ['15']
      });
      render(<SettingsBackup isPasswordProtected={false} />);

      await chooseFile();

      expect(screen.getByTestId('import-result-message')).toHaveTextContent(
        'importErrorFileTooLarge(15)'
      );
      expect(messaging.sendMessage).not.toHaveBeenCalled();
    });

    it('検証が理由を返さなければ既定の理由を出す', async () => {
      settingsExport.validateImportedData.mockReturnValue({ success: false });
      render(<SettingsBackup isPasswordProtected={false} />);

      await chooseFile();

      expect(screen.getByTestId('import-result-message')).toHaveTextContent(
        'importErrorInvalidFormat'
      );
    });

    it('検証を通っても中身が無ければ失敗として扱う', async () => {
      settingsExport.validateImportedData.mockReturnValue({ success: true });
      render(<SettingsBackup isPasswordProtected={false} />);

      await chooseFile();

      expect(screen.getByTestId('import-result-message')).toHaveTextContent(
        'importErrorInvalidFormat'
      );
    });

    it('background への保存が失敗したら確認を閉じて失敗を伝え、保存領域に書かない', async () => {
      messaging.sendMessage.mockResolvedValue({
        success: false,
        error: { code: 'save-failed' }
      });
      render(<SettingsBackup isPasswordProtected={false} />);

      await importFile();

      expect(
        screen.queryByTestId('import-confirm-message')
      ).not.toBeInTheDocument();
      expect(screen.getByTestId('import-result-message')).toHaveTextContent(
        'importErrorSaveFailed'
      );
      expect(storage.settingsItem.setValue).not.toHaveBeenCalled();
      expect(storage.visionItem.setValue).not.toHaveBeenCalled();
    });

    it('background へ送れなければ失敗として扱う', async () => {
      messaging.sendMessage.mockRejectedValue(new Error('disconnected'));
      render(<SettingsBackup isPasswordProtected={false} />);

      await importFile();

      expect(screen.getByTestId('import-result-message')).toHaveTextContent(
        'importErrorSaveFailed'
      );
    });

    it('background からの応答が無くても失敗として扱う', async () => {
      messaging.sendMessage.mockResolvedValue(undefined);
      render(<SettingsBackup isPasswordProtected={false} />);

      await importFile();

      expect(screen.getByTestId('import-result-message')).toHaveTextContent(
        'importErrorSaveFailed'
      );
    });

    it('ファイルが読めなければ失敗として扱う', async () => {
      settingsExport.readFileAsString.mockRejectedValue(new Error('io error'));
      render(<SettingsBackup isPasswordProtected={false} />);

      await chooseFile();

      expect(screen.getByTestId('import-result-message')).toHaveTextContent(
        'importErrorInvalidFormat'
      );
    });

    it('失敗しても同じファイルを選び直せるよう入力欄を空へ戻す', async () => {
      settingsExport.readFileAsString.mockRejectedValue(new Error('io error'));
      render(<SettingsBackup isPasswordProtected={false} />);

      await chooseFile();

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
      render(<SettingsBackup isPasswordProtected={false} />);

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

    it('インポートの結果表示は警告ごと片付く', async () => {
      settingsExport.validateImportedData.mockReturnValue({
        success: true,
        data: { sites: IMPORTED_SITES },
        warnings: ['importWarningOldVersion']
      });
      render(<SettingsBackup isPasswordProtected={false} />);

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
