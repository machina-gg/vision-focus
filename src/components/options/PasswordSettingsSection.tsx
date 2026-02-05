import React, { useState, useCallback } from 'react';
import { Lock, Shield } from 'lucide-react';

import { Card, Toggle } from '~/components/ui';
import { getMessage } from '~/lib/i18n';
import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength
} from '~/lib/password';
import type { PasswordSettings } from '~/types/storage';

import { FormActions, FormFeedback, PasswordField } from './password';

interface PasswordSettingsSectionProps {
  passwordSettings: PasswordSettings;
  onUpdate: (settings: PasswordSettings) => Promise<void>;
}

type SettingMode = 'view' | 'set' | 'change' | 'remove';

export function PasswordSettingsSection({
  passwordSettings,
  onUpdate
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

  const isEnabled = Boolean(
    passwordSettings.enabled && passwordSettings.passwordHash
  );

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

  /** Validates new password and confirmation, then hashes and saves */
  const saveNewPassword = useCallback(
    async (successMessageKey: string) => {
      const validation = validatePasswordStrength(newPassword);
      if (!validation.isValid && validation.errorKey) {
        setError(getMessage(validation.errorKey));
        return false;
      }
      if (newPassword !== confirmPassword) {
        setError(getMessage('passwordMismatch'));
        return false;
      }
      setIsProcessing(true);
      try {
        const hash = await hashPassword(newPassword);
        await onUpdate({ enabled: true, passwordHash: hash });
        setSuccess(getMessage(successMessageKey));
        setTimeout(resetForm, 2000);
        return true;
      } catch {
        return false;
      } finally {
        setIsProcessing(false);
      }
    },
    [newPassword, confirmPassword, onUpdate, resetForm]
  );

  /** Verifies the current password against stored hash */
  const verifyCurrentPassword = useCallback(async (): Promise<boolean> => {
    if (!passwordSettings.passwordHash) {
      setError(getMessage('passwordNotSet'));
      return false;
    }
    const isValid = await verifyPassword(
      currentPassword,
      passwordSettings.passwordHash
    );
    if (!isValid) {
      setError(getMessage('currentPasswordIncorrect'));
      return false;
    }
    return true;
  }, [currentPassword, passwordSettings.passwordHash]);

  const handleSetPassword = useCallback(async () => {
    setError(null);
    const saved = await saveNewPassword('passwordSetSuccess');
    if (!saved && !error) {
      setError(getMessage('passwordSetFailed'));
    }
  }, [saveNewPassword, error]);

  const handleChangePassword = useCallback(async () => {
    setError(null);
    const verified = await verifyCurrentPassword();
    if (!verified) return;
    const saved = await saveNewPassword('passwordChangedSuccess');
    if (!saved && !error) {
      setError(getMessage('passwordChangeFailed'));
    }
  }, [verifyCurrentPassword, saveNewPassword, error]);

  const handleRemovePassword = useCallback(async () => {
    setError(null);
    const verified = await verifyCurrentPassword();
    if (!verified) return;
    setIsProcessing(true);
    try {
      await onUpdate({ enabled: false, passwordHash: null });
      setSuccess(getMessage('passwordRemovedSuccess'));
      setTimeout(resetForm, 2000);
    } catch {
      setError(getMessage('passwordRemoveFailed'));
    } finally {
      setIsProcessing(false);
    }
  }, [verifyCurrentPassword, onUpdate, resetForm]);

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
        <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
          <Lock className="w-5 h-5 text-amber-600" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-gray-900">
            {getMessage('passwordProtection')}
          </h2>
          <p className="text-sm text-gray-500">
            {getMessage('passwordProtectionDescription')}
          </p>
        </div>
        {mode === 'view' && (
          <Toggle checked={isEnabled} onChange={handleToggle} />
        )}
      </div>

      {mode === 'view' && (
        <div
          className={`flex items-center gap-2 p-3 rounded-lg ${
            isEnabled ? 'bg-green-50' : 'bg-gray-50'
          }`}
        >
          <Shield
            className={`w-4 h-4 ${isEnabled ? 'text-green-600' : 'text-gray-400'}`}
          />
          <span
            className={`text-sm ${isEnabled ? 'text-green-700' : 'text-gray-500'}`}
          >
            {isEnabled
              ? getMessage('passwordProtectionEnabled')
              : getMessage('passwordProtectionDisabled')}
          </span>
          {isEnabled && (
            <button
              onClick={() => setMode('change')}
              className="ml-auto text-sm text-blue-600 hover:text-blue-800"
            >
              {getMessage('changePassword')}
            </button>
          )}
        </div>
      )}

      {mode === 'set' && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              {getMessage('passwordSetInstructions')}
            </p>
          </div>
          <div className="space-y-3">
            <PasswordField
              label={getMessage('newPassword')}
              value={newPassword}
              onChange={setNewPassword}
              show={showNewPassword}
              onToggleShow={() => setShowNewPassword(!showNewPassword)}
              placeholder={getMessage('passwordPlaceholder')}
            />
            <PasswordField
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
              label={getMessage('currentPassword')}
              value={currentPassword}
              onChange={setCurrentPassword}
              show={showCurrentPassword}
              onToggleShow={() => setShowCurrentPassword(!showCurrentPassword)}
              placeholder={getMessage('currentPasswordPlaceholder')}
            />
            <PasswordField
              label={getMessage('newPassword')}
              value={newPassword}
              onChange={setNewPassword}
              show={showNewPassword}
              onToggleShow={() => setShowNewPassword(!showNewPassword)}
              placeholder={getMessage('passwordPlaceholder')}
            />
            <PasswordField
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
          <div className="p-3 bg-amber-50 rounded-lg">
            <p className="text-sm text-amber-700">
              {getMessage('passwordRemoveWarning')}
            </p>
          </div>
          <PasswordField
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
