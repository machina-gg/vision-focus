import React from 'react';

import { Lock, Eye, EyeOff, X } from 'lucide-react';

import { getMessage } from '~/lib/i18n';

interface PasswordModalProps {
  passwordInput: string;
  onPasswordInputChange: (value: string) => void;
  passwordError: string | null;
  showPassword: boolean;
  onToggleShowPassword: () => void;
  isVerifying: boolean;
  onSubmit: () => void;
  onClose: () => void;
}

export function PasswordModal({
  passwordInput,
  onPasswordInputChange,
  passwordError,
  showPassword,
  onToggleShowPassword,
  isVerifying,
  onSubmit,
  onClose
}: PasswordModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full mx-4 max-w-sm bg-white rounded-xl shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">
            {getMessage('passwordRequired')}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-3 p-3 bg-warning-50 rounded-lg">
            <Lock className="w-5 h-5 text-warning-600 flex-shrink-0" />
            <p className="text-sm text-warning-800">
              {getMessage('passwordRequiredForPause')}
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {getMessage('enterPassword')}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={passwordInput}
                onChange={(e) => onPasswordInputChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isVerifying) {
                    onSubmit();
                  }
                }}
                placeholder={getMessage('passwordPlaceholder')}
                className="w-full px-3 py-2 pr-10 text-gray-800 placeholder-gray-400 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                autoFocus
              />
              <button
                type="button"
                onClick={onToggleShowPassword}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {passwordError && (
              <p className="text-sm text-danger-600">{passwordError}</p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              {getMessage('cancel')}
            </button>
            <button
              onClick={onSubmit}
              disabled={isVerifying || !passwordInput}
              className="flex-1 px-4 py-2 text-white bg-primary-500 rounded-lg hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isVerifying ? getMessage('verifying') : getMessage('confirm')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
