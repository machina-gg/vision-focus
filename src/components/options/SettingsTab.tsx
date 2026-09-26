import React from 'react';

import { PasswordSettingsSection } from '~/components/options/PasswordSettingsSection';
import { NotificationSettingsSection } from '~/components/options/blocklist/NotificationSettingsSection';
import { SettingsDataPrivacy } from '~/components/options/SettingsDataPrivacy';
import { SettingsBackup } from '~/components/options/SettingsBackup';
import { useSettings } from '~/contexts/SettingsContext';
import type {
  AnalyticsOptIn,
  NotificationSettings,
  PasswordSettings,
  UnblockConfirmSettings
} from '~/types/storage';
import {
  DEFAULT_PASSWORD_SETTINGS,
  DEFAULT_UNBLOCK_CONFIRM_SETTINGS
} from '~/types/storage';

/** SettingsTab に渡す各設定の保存先 */
interface SettingsTabProps {
  /** パスワード設定を保存する */
  onPasswordUpdate: (settings: PasswordSettings) => Promise<void>;
  /** 解除の確認（長押しの秒数）の設定を保存する */
  onUnblockConfirmUpdate: (settings: UnblockConfirmSettings) => Promise<void>;
  /** 通知の設定を保存する */
  onUpdateNotifications: (notifications: NotificationSettings) => void;
  /** 利用統計の共有の選択を保存する */
  onAnalyticsOptInChange: (optIn: AnalyticsOptIn) => Promise<void>;
  /** バックアップから設定を読み込んだあとに呼ぶ */
  onSettingsChange: () => void;
}

/**
 * 設定画面の設定タブ（解除保護・通知・データとプライバシー・バックアップ）を表示する（設定はコンテキストから読み、未読み込みの項目は既定値で出す）
 * @param props 各設定の保存先（各フィールドは SettingsTabProps）
 * @returns 設定タブの中身
 */
export function SettingsTab({
  onPasswordUpdate,
  onUnblockConfirmUpdate,
  onUpdateNotifications,
  onAnalyticsOptInChange,
  onSettingsChange
}: SettingsTabProps) {
  const { settings } = useSettings();
  return (
    <div className="space-y-6">
      <PasswordSettingsSection
        passwordSettings={settings?.password ?? DEFAULT_PASSWORD_SETTINGS}
        onUpdate={onPasswordUpdate}
        holdSeconds={
          (settings?.unblockConfirm ?? DEFAULT_UNBLOCK_CONFIRM_SETTINGS)
            .holdSeconds
        }
        onUnblockConfirmUpdate={onUnblockConfirmUpdate}
      />

      <NotificationSettingsSection
        notifications={settings?.notifications}
        onUpdate={onUpdateNotifications}
      />

      <SettingsDataPrivacy
        settings={settings}
        onAnalyticsOptInChange={onAnalyticsOptInChange}
      />

      <SettingsBackup onSettingsChange={onSettingsChange} />
    </div>
  );
}
