import React, { useState, useCallback } from 'react';
import { Lock, Shield } from 'lucide-react';

import { Card, Toggle } from '~/components/ui';
import { STATUS_RESET_DELAY_MS } from '~/constants/intervals';
import { getMessage } from '~/lib/i18n';
import { messageErrorText } from '~/lib/messageError';
import { sendMessage } from '~/lib/messaging';
import {
  isProtectedByPassword,
  validatePasswordStrength
} from '~/lib/password';
import type { MessageError, SettingsChangeResponse } from '~/types/messages';
import type {
  PasswordSettings,
  UnblockConfirmSettings,
  UnblockHoldSeconds
} from '~/types/storage';

import { FormActions, FormFeedback, PasswordField } from './password';
import { UnblockHoldSecondsField } from './UnblockHoldSecondsField';

/** PasswordSettingsSection に渡す解除保護の現在の設定と保存先 */
interface PasswordSettingsSectionProps {
  /** 現在のパスワード設定（保護中かは isProtectedByPassword で判定する） */
  passwordSettings: PasswordSettings;
  /** 解除の確認で長押しさせる秒数 */
  holdSeconds: UnblockHoldSeconds;
  /** 長押しの秒数を変えたときに、変更後の確認設定を保存する */
  onUnblockConfirmUpdate: (settings: UnblockConfirmSettings) => Promise<void>;
}

type SettingMode = 'view' | 'set' | 'change' | 'remove';

function failureText(
  error: MessageError | undefined,
  fallbackKey: string
): string {
  switch (error?.code) {
    case 'password-mismatch':
      return getMessage('currentPasswordIncorrect');
    case 'password-invalid':
    case 'password-not-set':
      return messageErrorText(error);
    default:
      return getMessage(fallbackKey);
  }
}

/**
 * 解除保護の設定（長押しの秒数と、パスワードの設定・変更・解除のフォーム）をカードで表示する（パスワードの保護中は長押しの秒数を変えられない。パスワードは平文で background へ送り、照合とハッシュ化は background が行う）
 * @param props 現在の設定と保存先（各フィールドは PasswordSettingsSectionProps）
 * @returns 解除保護のカード
 */
export function PasswordSettingsSection({
  passwordSettings,
  holdSeconds,
  onUnblockConfirmUpdate
}: PasswordSettingsSectionProps) {
  const [mode, setMode] = useState<SettingMode>('view');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const isEnabled = isProtectedByPassword(passwordSettings);

  const resetForm = useCallback(() => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setError(null);
    setSuccess(null);
    setMode('view');
  }, []);

  const checkNewPassword = useCallback((): boolean => {
    const reason = validatePasswordStrength(newPassword);
    if (reason) {
      setError(messageErrorText({ code: 'password-invalid', reason }));
      return false;
    }
    if (newPassword !== confirmPassword) {
      setError(getMessage('passwordMismatch'));
      return false;
    }
    return true;
  }, [newPassword, confirmPassword]);

  const submit = useCallback(
    async (
      send: () => Promise<SettingsChangeResponse>,
      successKey: string,
      failureKey: string
    ) => {
      setIsProcessing(true);
      try {
        const response = await send();
        if (response.success) {
          setSuccess(getMessage(successKey));
          setTimeout(resetForm, STATUS_RESET_DELAY_MS);
        } else {
          setError(failureText(response.error, failureKey));
        }
      } catch {
        setError(getMessage(failureKey));
      } finally {
        setIsProcessing(false);
      }
    },
    [resetForm]
  );

  const handleSetPassword = useCallback(async () => {
    setError(null);
    if (!checkNewPassword()) return;
    await submit(
      () => sendMessage('set-password', { password: newPassword }),
      'passwordSetSuccess',
      'passwordSetFailed'
    );
  }, [checkNewPassword, submit, newPassword]);

  const handleChangePassword = useCallback(async () => {
    setError(null);
    if (!checkNewPassword()) return;
    await submit(
      () => sendMessage('change-password', { currentPassword, newPassword }),
      'passwordChangedSuccess',
      'passwordChangeFailed'
    );
  }, [checkNewPassword, submit, currentPassword, newPassword]);

  const handleRemovePassword = useCallback(async () => {
    setError(null);
    await submit(
      () => sendMessage('remove-password', { currentPassword }),
      'passwordRemovedSuccess',
      'passwordRemoveFailed'
    );
  }, [submit, currentPassword]);

  const handleToggle = useCallback(
    (enabled: boolean) => {
      if (enabled && !isEnabled) {
        setMode('set');
      } else if (!enabled && isEnabled) {
        setMode('remove');
      }
    },
    [isEnabled]
  );

  return (
    <Card>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-warning-100 rounded-lg flex items-center justify-center">
          <Lock className="w-5 h-5 text-warning-600" />
        </div>
        <h2
          className="text-lg font-semibold text-gray-900"
          data-testid="settings-unblock-protection-section"
        >
          {getMessage('unblockProtection')}
        </h2>
      </div>

      <UnblockHoldSecondsField
        holdSeconds={holdSeconds}
        onUpdate={onUnblockConfirmUpdate}
        disabled={isEnabled}
      />

      <div className="flex items-center gap-3 mt-6 pt-6 mb-4 border-t border-gray-100">
        <div className="flex-1">
          <h3
            className="font-medium text-gray-900"
            data-testid="settings-password-section"
          >
            {getMessage('passwordProtection')}
          </h3>
          <p className="text-sm text-gray-500">
            {getMessage('passwordProtectionDescription')}
          </p>
        </div>
        {mode === 'view' && (
          <Toggle
            checked={isEnabled}
            onChange={handleToggle}
            data-testid="password-enable-toggle"
          />
        )}
      </div>

      {mode === 'view' && (
        <div
          className={`flex items-center gap-2 p-3 rounded-lg ${
            isEnabled ? 'bg-success-50' : 'bg-gray-50'
          }`}
        >
          <Shield
            className={`w-4 h-4 ${isEnabled ? 'text-success-600' : 'text-gray-400'}`}
          />
          <span
            className={`text-sm ${isEnabled ? 'text-success-700' : 'text-gray-500'}`}
          >
            {isEnabled
              ? getMessage('passwordProtectionEnabled')
              : getMessage('passwordProtectionDisabled')}
          </span>
          {isEnabled && (
            <button
              data-testid="password-change-button"
              onClick={() => setMode('change')}
              className="ml-auto text-sm text-info-600 hover:text-info-800"
            >
              {getMessage('changePassword')}
            </button>
          )}
        </div>
      )}

      {mode === 'set' && (
        <div className="space-y-4">
          <div className="p-3 bg-info-50 rounded-lg">
            <p className="text-sm text-info-700">
              {getMessage('passwordSetInstructions')}
            </p>
          </div>
          <div className="space-y-3">
            <PasswordField
              fieldId="password-field-new"
              label={getMessage('newPassword')}
              value={newPassword}
              onChange={setNewPassword}
              show={showNewPassword}
              onToggleShow={() => setShowNewPassword(!showNewPassword)}
              placeholder={getMessage('passwordPlaceholder')}
            />
            <PasswordField
              fieldId="password-field-confirm"
              label={getMessage('confirmPassword')}
              value={confirmPassword}
              onChange={setConfirmPassword}
              show={showConfirmPassword}
              onToggleShow={() => setShowConfirmPassword(!showConfirmPassword)}
              placeholder={getMessage('confirmPasswordPlaceholder')}
            />
          </div>
          <FormFeedback error={error} success={success} />
          <FormActions
            onCancel={resetForm}
            onSubmit={handleSetPassword}
            submitLabel={getMessage('setPassword')}
            submitDisabled={isProcessing || !newPassword || !confirmPassword}
            isProcessing={isProcessing}
          />
        </div>
      )}

      {mode === 'change' && (
        <div className="space-y-4">
          <div className="space-y-3">
            <PasswordField
              fieldId="password-field-current"
              label={getMessage('currentPassword')}
              value={currentPassword}
              onChange={setCurrentPassword}
              show={showCurrentPassword}
              onToggleShow={() => setShowCurrentPassword(!showCurrentPassword)}
              placeholder={getMessage('currentPasswordPlaceholder')}
            />
            <PasswordField
              fieldId="password-field-new"
              label={getMessage('newPassword')}
              value={newPassword}
              onChange={setNewPassword}
              show={showNewPassword}
              onToggleShow={() => setShowNewPassword(!showNewPassword)}
              placeholder={getMessage('passwordPlaceholder')}
            />
            <PasswordField
              fieldId="password-field-confirm"
              label={getMessage('confirmPassword')}
              value={confirmPassword}
              onChange={setConfirmPassword}
              show={showConfirmPassword}
              onToggleShow={() => setShowConfirmPassword(!showConfirmPassword)}
              placeholder={getMessage('confirmPasswordPlaceholder')}
            />
          </div>
          <FormFeedback error={error} success={success} />
          <FormActions
            onCancel={resetForm}
            onSubmit={handleChangePassword}
            submitLabel={getMessage('changePassword')}
            submitDisabled={
              isProcessing ||
              !currentPassword ||
              !newPassword ||
              !confirmPassword
            }
            isProcessing={isProcessing}
          />
        </div>
      )}

      {mode === 'remove' && (
        <div className="space-y-4">
          <div className="p-3 bg-warning-50 rounded-lg">
            <p className="text-sm text-warning-700">
              {getMessage('passwordRemoveWarning')}
            </p>
          </div>
          <PasswordField
            fieldId="password-field-current"
            label={getMessage('currentPassword')}
            value={currentPassword}
            onChange={setCurrentPassword}
            show={showCurrentPassword}
            onToggleShow={() => setShowCurrentPassword(!showCurrentPassword)}
            placeholder={getMessage('currentPasswordPlaceholder')}
          />
          <FormFeedback error={error} success={success} />
          <FormActions
            onCancel={resetForm}
            onSubmit={handleRemovePassword}
            submitLabel={getMessage('removePassword')}
            submitDisabled={isProcessing || !currentPassword}
            isProcessing={isProcessing}
            submitVariant="danger"
          />
        </div>
      )}
    </Card>
  );
}
