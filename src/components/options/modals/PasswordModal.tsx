import React, { useState, useCallback, useEffect } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';

import { Modal, Button, Input } from '~/components/ui';
import { getMessage } from '~/lib/i18n';
import { verifyPassword } from '~/lib/password';

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  passwordHash: string;
  title?: string;
  description?: string;
}

export function PasswordModal({
  isOpen,
  onClose,
  onSuccess,
  passwordHash,
  title,
  description
}: PasswordModalProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError(null);
      setShowPassword(false);
    }
  }, [isOpen]);

  const handleSubmit = useCallback(async () => {
    if (!password) {
      setError(getMessage('passwordRequired'));
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const isValid = await verifyPassword(password, passwordHash);

      if (isValid) {
        onSuccess();
        onClose();
      } else {
        setError(getMessage('passwordIncorrect'));
      }
    } catch {
      setError(getMessage('passwordVerificationFailed'));
    } finally {
      setIsVerifying(false);
    }
  }, [password, passwordHash, onSuccess, onClose]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !isVerifying) {
        handleSubmit();
      }
    },
    [handleSubmit, isVerifying]
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title || getMessage('passwordRequired')}
      size="sm"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-lg">
          <Lock className="w-5 h-5 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">
            {description || getMessage('passwordRequiredDescription')}
          </p>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {getMessage('enterPassword')}
          </label>
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={setPassword}
              onKeyDown={handleKeyDown}
              placeholder={getMessage('passwordPlaceholder')}
              className="pr-10"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            {getMessage('cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isVerifying || !password}
            className="flex-1"
          >
            {isVerifying ? getMessage('verifying') : getMessage('confirm')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
