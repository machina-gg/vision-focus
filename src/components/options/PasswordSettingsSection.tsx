import React, { useState, useCallback } from 'react';
import { Lock, Shield, Eye, EyeOff, Check, AlertTriangle } from 'lucide-react';

import { Button, Card, Input, Toggle } from '~/components/ui';
import { getMessage } from '~/lib/i18n';
import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength
} from '~/lib/password';
import type { PasswordSettings } from '~/types/storage';

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

  const isEnabled = passwordSettings.enabled && passwordSettings.passwordHash;

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

  const handleSetPassword = useCallback(async () => {
    setError(null);

    // Validate new password
    const validation = validatePasswordStrength(newPassword);
    if (!validation.isValid && validation.errorKey) {
      setError(getMessage(validation.errorKey));
      return;
    }

    // Check confirmation matches
    if (newPassword !== confirmPassword) {
      setError(getMessage('passwordMismatch'));
      return;
    }

    setIsProcessing(true);
    try {
      const hash = await hashPassword(newPassword);
      await onUpdate({
        enabled: true,
        passwordHash: hash
      });
      setSuccess(getMessage('passwordSetSuccess'));
      setTimeout(() => {
        resetForm();
      }, 2000);
    } catch {
      setError(getMessage('passwordSetFailed'));
    } finally {
      setIsProcessing(false);
    }
  }, [newPassword, confirmPassword, onUpdate, resetForm]);

  const handleChangePassword = useCallback(async () => {
    setError(null);

    // Verify current password
    if (!passwordSettings.passwordHash) {
      setError(getMessage('passwordNotSet'));
      return;
    }

    const isCurrentValid = await verifyPassword(
      currentPassword,
      passwordSettings.passwordHash
    );
    if (!isCurrentValid) {
      setError(getMessage('currentPasswordIncorrect'));
      return;
    }

    // Validate new password
    const validation = validatePasswordStrength(newPassword);
    if (!validation.isValid && validation.errorKey) {
      setError(getMessage(validation.errorKey));
      return;
    }

    // Check confirmation matches
    if (newPassword !== confirmPassword) {
      setError(getMessage('passwordMismatch'));
      return;
    }

    setIsProcessing(true);
    try {
      const hash = await hashPassword(newPassword);
      await onUpdate({
        enabled: true,
        passwordHash: hash
      });
      setSuccess(getMessage('passwordChangedSuccess'));
      setTimeout(() => {
        resetForm();
      }, 2000);
    } catch {
      setError(getMessage('passwordChangeFailed'));
    } finally {
      setIsProcessing(false);
    }
  }, [currentPassword, newPassword, confirmPassword, passwordSettings, onUpdate, resetForm]);

  const handleRemovePassword = useCallback(async () => {
    setError(null);

    // Verify current password
    if (!passwordSettings.passwordHash) {
      setError(getMessage('passwordNotSet'));
      return;
    }

    const isCurrentValid = await verifyPassword(
      currentPassword,
      passwordSettings.passwordHash
    );
    if (!isCurrentValid) {
      setError(getMessage('currentPasswordIncorrect'));
      return;
    }

    setIsProcessing(true);
    try {
      await onUpdate({
        enabled: false,
        passwordHash: null
      });
      setSuccess(getMessage('passwordRemovedSuccess'));
      setTimeout(() => {
        resetForm();
      }, 2000);
    } catch {
      setError(getMessage('passwordRemoveFailed'));
    } finally {
      setIsProcessing(false);
    }
  }, [currentPassword, passwordSettings, onUpdate, resetForm]);

  const handleToggle = useCallback(
    (enabled: boolean) => {
      if (enabled && !isEnabled) {
        // Start setting password
        setMode('set');
      } else if (!enabled && isEnabled) {
        // Start removing password
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

      {/* Status indicator */}
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

      {/* Set Password Form */}
      {mode === 'set' && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              {getMessage('passwordSetInstructions')}
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {getMessage('newPassword')}
              </label>
              <div className="relative">
                <Input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={setNewPassword}
                  placeholder={getMessage('passwordPlaceholder')}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                >
                  {showNewPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {getMessage('confirmPassword')}
              </label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  placeholder={getMessage('confirmPasswordPlaceholder')}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <AlertTriangle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <Check className="w-4 h-4" />
              <span>{success}</span>
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="secondary" onClick={resetForm} className="flex-1">
              {getMessage('cancel')}
            </Button>
            <Button
              onClick={handleSetPassword}
              disabled={isProcessing || !newPassword || !confirmPassword}
              className="flex-1"
            >
              {isProcessing ? getMessage('processing') : getMessage('setPassword')}
            </Button>
          </div>
        </div>
      )}

      {/* Change Password Form */}
      {mode === 'change' && (
        <div className="space-y-4">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {getMessage('currentPassword')}
              </label>
              <div className="relative">
                <Input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={setCurrentPassword}
                  placeholder={getMessage('currentPasswordPlaceholder')}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                >
                  {showCurrentPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {getMessage('newPassword')}
              </label>
              <div className="relative">
                <Input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={setNewPassword}
                  placeholder={getMessage('passwordPlaceholder')}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                >
                  {showNewPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {getMessage('confirmPassword')}
              </label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  placeholder={getMessage('confirmPasswordPlaceholder')}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <AlertTriangle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <Check className="w-4 h-4" />
              <span>{success}</span>
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="secondary" onClick={resetForm} className="flex-1">
              {getMessage('cancel')}
            </Button>
            <Button
              onClick={handleChangePassword}
              disabled={
                isProcessing || !currentPassword || !newPassword || !confirmPassword
              }
              className="flex-1"
            >
              {isProcessing
                ? getMessage('processing')
                : getMessage('changePassword')}
            </Button>
          </div>
        </div>
      )}

      {/* Remove Password Form */}
      {mode === 'remove' && (
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 rounded-lg">
            <p className="text-sm text-amber-700">
              {getMessage('passwordRemoveWarning')}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {getMessage('currentPassword')}
            </label>
            <div className="relative">
              <Input
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={setCurrentPassword}
                placeholder={getMessage('currentPasswordPlaceholder')}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
              >
                {showCurrentPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <AlertTriangle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <Check className="w-4 h-4" />
              <span>{success}</span>
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="secondary" onClick={resetForm} className="flex-1">
              {getMessage('cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={handleRemovePassword}
              disabled={isProcessing || !currentPassword}
              className="flex-1"
            >
              {isProcessing
                ? getMessage('processing')
                : getMessage('removePassword')}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
