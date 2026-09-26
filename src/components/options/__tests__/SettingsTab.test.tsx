import React from 'react';

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { SettingsTab } from '../SettingsTab';
import {
  DEFAULT_PASSWORD_SETTINGS,
  DEFAULT_SETTINGS,
  type AppSettings,
  type BlockItem,
  type PasswordSettings
} from '~/types/storage';

/**
 * SettingsTab が並べるカードの順と、子へ渡す値の検査
 *
 * カードの中身はそれぞれのコンポーネントの責務なので、通知設定以外は差し替えて
 * 「出るか」「何が渡るか」だけを見る。通知設定は時間制限つきサイトの有無で
 * 出し分けないことを確かめるため実体のまま描画する。
 */

const received = vi.hoisted(() => ({
  password: undefined as
    | {
        passwordSettings: PasswordSettings;
        onUpdate: unknown;
        holdSeconds: number;
        onUnblockConfirmUpdate: unknown;
      }
    | undefined,
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

vi.mock('~/components/options/PasswordSettingsSection', () => ({
  PasswordSettingsSection: (props: {
    passwordSettings: PasswordSettings;
    onUpdate: unknown;
    holdSeconds: number;
    onUnblockConfirmUpdate: unknown;
  }) => {
    received.password = props;
    return <div data-testid="password-settings" />;
  }
}));
vi.mock('~/components/options/SettingsDataPrivacy', () => ({
  SettingsDataPrivacy: (props: {
    settings: AppSettings | undefined;
    onAnalyticsOptInChange: unknown;
  }) => {
    received.privacy = props;
    return <div data-testid="settings-data-privacy" />;
  }
}));
vi.mock('~/components/options/SettingsBackup', () => ({
  SettingsBackup: (props: { onSettingsChange: unknown }) => {
    received.backup = props;
    return <div data-testid="settings-backup" />;
  }
}));

const handlers = () => ({
  onPasswordUpdate: vi.fn(),
  onUnblockConfirmUpdate: vi.fn(),
  onUpdateNotifications: vi.fn(),
  onAnalyticsOptInChange: vi.fn(),
  onSettingsChange: vi.fn()
});

const blockItem = (timeLimit: BlockItem['timeLimit']): BlockItem => ({
  id: '1',
  domain: 'example.com',
  isWildcard: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  enabled: true,
  timeLimit
});

beforeEach(() => {
  received.password = undefined;
  received.privacy = undefined;
  received.backup = undefined;
  context.settings = undefined;
});

describe('SettingsTab', () => {
  describe('カードの並び', () => {
    it('ブロック解除の保護 / 通知設定 / データとプライバシー / バックアップの順に出す', () => {
      render(<SettingsTab {...handlers()} />);

      const cards = [
        screen.getByTestId('password-settings'),
        screen.getByText('notificationSettings'),
        screen.getByTestId('settings-data-privacy'),
        screen.getByTestId('settings-backup')
      ];
      for (let i = 1; i < cards.length; i++) {
        expect(
          cards[i - 1].compareDocumentPosition(cards[i]) &
            Node.DOCUMENT_POSITION_FOLLOWING
        ).toBeTruthy();
      }
    });
  });

  describe('通知設定', () => {
    it('時間制限つきのサイトが無くても出す', () => {
      context.settings = {
        ...DEFAULT_SETTINGS,
        blockList: [blockItem(null)]
      };

      render(<SettingsTab {...handlers()} />);

      expect(screen.getByText('notificationSettings')).toBeInTheDocument();
      expect(
        screen.getByText('notificationSettingsDescription')
      ).toBeInTheDocument();
    });

    it('時間制限つきのサイトがあっても出す', () => {
      context.settings = {
        ...DEFAULT_SETTINGS,
        blockList: [blockItem({ type: 'daily', limitSeconds: 1800 })]
      };

      render(<SettingsTab {...handlers()} />);

      expect(screen.getByText('notificationSettings')).toBeInTheDocument();
    });
  });

  describe('ブロック解除の保護', () => {
    it('更新の手段をそのまま子へ渡す', () => {
      const props = handlers();
      render(<SettingsTab {...props} />);

      expect(received.password?.onUpdate).toBe(props.onPasswordUpdate);
      expect(received.password?.onUnblockConfirmUpdate).toBe(
        props.onUnblockConfirmUpdate
      );
    });

    it('設定が未読み込みなら既定のパスワード設定と秒数を渡す', () => {
      render(<SettingsTab {...handlers()} />);

      expect(received.password?.passwordSettings).toEqual(
        DEFAULT_PASSWORD_SETTINGS
      );
      expect(received.password?.holdSeconds).toBe(5);
    });

    it('保存済みのパスワード設定と秒数があればそれを渡す', () => {
      const password: PasswordSettings = {
        enabled: true,
        passwordHash: 'stored-hash'
      };
      context.settings = {
        ...DEFAULT_SETTINGS,
        password,
        unblockConfirm: { holdSeconds: 30 }
      };

      render(<SettingsTab {...handlers()} />);

      expect(received.password?.passwordSettings).toEqual(password);
      expect(received.password?.holdSeconds).toBe(30);
    });
  });

  describe('データとプライバシー', () => {
    it('変更の手段を設定とともに子へ渡す', () => {
      const props = handlers();
      context.settings = DEFAULT_SETTINGS;

      render(<SettingsTab {...props} />);

      expect(received.privacy?.settings).toBe(DEFAULT_SETTINGS);
      expect(received.privacy?.onAnalyticsOptInChange).toBe(
        props.onAnalyticsOptInChange
      );
    });
  });

  describe('バックアップ', () => {
    it('設定変更の通知先をそのまま渡す', () => {
      const props = handlers();
      render(<SettingsTab {...props} />);

      expect(received.backup?.onSettingsChange).toBe(props.onSettingsChange);
    });
  });
});
