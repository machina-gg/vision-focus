import React from 'react';

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { HelpTab } from '../HelpTab';
import {
  DEFAULT_PASSWORD_SETTINGS,
  DEFAULT_SETTINGS,
  type AppSettings,
  type PasswordSettings
} from '~/types/storage';

/**
 * HelpTab が並べる節の出し分けと、子へ渡す値の検査
 *
 * パスワード保護とデータ・プライバシーの節は、対応するハンドラを渡された
 * ときだけ出す（オプション画面以外から使われたときに操作させないため）。
 * 設定が未読み込み（undefined）のときに既定値へ落ちることも確かめる。
 *
 * 各節の中身はそれぞれのコンポーネントの責務なので、ここでは差し替えて
 * 「出るか」「何が渡るか」だけを見る。
 */

const received = vi.hoisted(() => ({
  password: undefined as
    { passwordSettings: PasswordSettings; onUpdate: unknown } | undefined,
  privacy: undefined as
    | { settings: AppSettings | undefined; onAnalyticsOptInChange: unknown }
    | undefined,
  backup: undefined as { onSettingsChange: unknown } | undefined
}));

const context = vi.hoisted(() => ({
  settings: undefined as AppSettings | undefined
}));

vi.mock('~/contexts/SettingsContext', () => ({
  useSettings: () => ({
    settings: context.settings,
    setSettings: vi.fn(),
    vision: undefined,
    setVision: vi.fn()
  })
}));

vi.mock('~/components/options/HelpGettingStarted', () => ({
  HelpGettingStarted: () => <div data-testid="help-getting-started" />
}));
vi.mock('~/components/options/HelpFAQ', () => ({
  HelpFAQ: () => <div data-testid="help-faq" />
}));
vi.mock('~/components/options/HelpTroubleshooting', () => ({
  HelpTroubleshooting: () => <div data-testid="help-troubleshooting" />
}));
vi.mock('~/components/options/PasswordSettingsSection', () => ({
  PasswordSettingsSection: (props: {
    passwordSettings: PasswordSettings;
    onUpdate: unknown;
  }) => {
    received.password = props;
    return <div data-testid="password-settings" />;
  }
}));
vi.mock('~/components/options/HelpDataPrivacy', () => ({
  HelpDataPrivacy: (props: {
    settings: AppSettings | undefined;
    onAnalyticsOptInChange: unknown;
  }) => {
    received.privacy = props;
    return <div data-testid="help-data-privacy" />;
  }
}));
vi.mock('~/components/options/HelpSettingsBackup', () => ({
  HelpSettingsBackup: (props: { onSettingsChange: unknown }) => {
    received.backup = props;
    return <div data-testid="help-settings-backup" />;
  }
}));
vi.mock('~/components/features', () => ({
  SupportSection: () => <div data-testid="support-section" />
}));

beforeEach(() => {
  received.password = undefined;
  received.privacy = undefined;
  received.backup = undefined;
  context.settings = undefined;
});

describe('HelpTab', () => {
  describe('常に出る節', () => {
    it('使い方・FAQ・困ったとき・バックアップ・支援を並べる', () => {
      render(<HelpTab />);

      expect(screen.getByTestId('help-getting-started')).toBeInTheDocument();
      expect(screen.getByTestId('help-faq')).toBeInTheDocument();
      expect(screen.getByTestId('help-troubleshooting')).toBeInTheDocument();
      expect(screen.getByTestId('help-settings-backup')).toBeInTheDocument();
      expect(screen.getByTestId('support-section')).toBeInTheDocument();
    });

    it('問い合わせ先を別タブで開くリンクとして出す', () => {
      render(<HelpTab />);

      const link = screen.getByRole('link', { name: 'helpContactUs' });
      expect(link).toHaveAttribute(
        'href',
        'https://docs.google.com/forms/d/e/1FAIpQLSf3yxG71Z4YQWkoZqBMFuUb0Zxvj0DQFS9FEODjUVDQSnzXhg/viewform'
      );
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('版数を出す', () => {
      render(<HelpTab />);

      expect(screen.getByText('VisionFocus v1.0.0')).toBeInTheDocument();
    });
  });

  describe('パスワード保護の節', () => {
    it('更新の手段が渡されなければ出さない', () => {
      render(<HelpTab />);

      expect(screen.queryByTestId('password-settings')).not.toBeInTheDocument();
    });

    it('更新の手段が渡されれば出し、そのまま子へ渡す', () => {
      const onPasswordUpdate = vi.fn();
      render(<HelpTab onPasswordUpdate={onPasswordUpdate} />);

      expect(screen.getByTestId('password-settings')).toBeInTheDocument();
      expect(received.password?.onUpdate).toBe(onPasswordUpdate);
    });

    it('設定が未読み込みなら既定のパスワード設定を渡す', () => {
      render(<HelpTab onPasswordUpdate={vi.fn()} />);

      expect(received.password?.passwordSettings).toEqual(
        DEFAULT_PASSWORD_SETTINGS
      );
    });

    it('保存済みのパスワード設定があればそれを渡す', () => {
      const password: PasswordSettings = {
        enabled: true,
        passwordHash: 'stored-hash'
      };
      context.settings = { ...DEFAULT_SETTINGS, password };

      render(<HelpTab onPasswordUpdate={vi.fn()} />);

      expect(received.password?.passwordSettings).toEqual(password);
    });
  });

  describe('データとプライバシーの節', () => {
    it('変更の手段が渡されなければ出さない', () => {
      render(<HelpTab />);

      expect(screen.queryByTestId('help-data-privacy')).not.toBeInTheDocument();
    });

    it('変更の手段が渡されれば出し、設定とともに子へ渡す', () => {
      const onAnalyticsOptInChange = vi.fn();
      context.settings = DEFAULT_SETTINGS;

      render(<HelpTab onAnalyticsOptInChange={onAnalyticsOptInChange} />);

      expect(screen.getByTestId('help-data-privacy')).toBeInTheDocument();
      expect(received.privacy?.settings).toBe(DEFAULT_SETTINGS);
      expect(received.privacy?.onAnalyticsOptInChange).toBe(
        onAnalyticsOptInChange
      );
    });

    it('設定が未読み込みでも例外にならず、そのまま渡す', () => {
      render(<HelpTab onAnalyticsOptInChange={vi.fn()} />);

      expect(screen.getByTestId('help-data-privacy')).toBeInTheDocument();
      expect(received.privacy?.settings).toBeUndefined();
    });
  });

  describe('バックアップの節', () => {
    it('設定変更の通知先をそのまま渡す', () => {
      const onSettingsChange = vi.fn();
      render(<HelpTab onSettingsChange={onSettingsChange} />);

      expect(received.backup?.onSettingsChange).toBe(onSettingsChange);
    });

    it('通知先が無くても節は出す', () => {
      render(<HelpTab />);

      expect(screen.getByTestId('help-settings-backup')).toBeInTheDocument();
      expect(received.backup?.onSettingsChange).toBeUndefined();
    });
  });
});
