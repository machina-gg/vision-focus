import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ShieldOff, Trash2 } from 'lucide-react';

import { Modal, Button } from '~/components/ui';
import { getMessage } from '~/lib/i18n';

const HOLD_DURATION_MS = 5000;

type UnblockAction = 'toggle' | 'delete';

interface UnblockConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  domain: string;
  blockStyle: string;
  action: UnblockAction;
}

export function UnblockConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  domain,
  blockStyle,
  action
}: UnblockConfirmModalProps) {
  const [progress, setProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const resetProgress = useCallback(() => {
    setProgress(0);
    setIsHolding(false);
    startTimeRef.current = null;
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      resetProgress();
    }
  }, [isOpen, resetProgress]);

  const updateProgress = useCallback(() => {
    if (startTimeRef.current === null) return;

    const elapsed = Date.now() - startTimeRef.current;
    const newProgress = Math.min((elapsed / HOLD_DURATION_MS) * 100, 100);
    setProgress(newProgress);

    if (newProgress >= 100) {
      resetProgress();
      onConfirm();
      onClose();
      return;
    }

    animationFrameRef.current = requestAnimationFrame(updateProgress);
  }, [onConfirm, onClose, resetProgress]);

  const handlePointerDown = useCallback(() => {
    startTimeRef.current = Date.now();
    setIsHolding(true);
    animationFrameRef.current = requestAnimationFrame(updateProgress);
  }, [updateProgress]);

  const handlePointerUp = useCallback(() => {
    resetProgress();
  }, [resetProgress]);

  const handlePointerLeave = useCallback(() => {
    resetProgress();
  }, [resetProgress]);

  // Clean up animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const description =
    action === 'delete'
      ? getMessage('deleteBlockConfirmDescription', domain)
      : getMessage('unblockConfirmDescription', domain);

  const Icon = action === 'delete' ? Trash2 : ShieldOff;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={getMessage('unblockConfirmTitle')}
      size="sm"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 bg-warning-50 rounded-lg">
          <Icon className="w-5 h-5 text-warning-600 flex-shrink-0" />
          <div className="space-y-1">
            <p className="text-sm text-warning-800">{description}</p>
            <p className="text-xs text-warning-600">
              {getMessage('unblockConfirmBlockStyle', blockStyle)}
            </p>
          </div>
        </div>

        {/* Long-press button */}
        <div className="space-y-2">
          <button
            type="button"
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerLeave}
            className="relative w-full h-12 overflow-hidden rounded-lg border-2 border-danger-300 bg-danger-50 select-none touch-none cursor-pointer transition-colors hover:border-danger-400"
          >
            {/* Progress bar */}
            <div
              className="absolute inset-y-0 left-0 bg-danger-200 transition-none"
              style={{ width: `${progress}%` }}
            />
            {/* Button text */}
            <div className="relative flex items-center justify-center gap-2 h-full">
              <Icon
                className={`w-4 h-4 ${isHolding ? 'text-danger-700' : 'text-danger-500'}`}
              />
              <span
                className={`text-sm font-medium ${isHolding ? 'text-danger-700' : 'text-danger-600'}`}
              >
                {getMessage('unblockConfirmHoldButton')}
                {isHolding && ` (${Math.ceil(((100 - progress) / 100) * 5)}s)`}
              </span>
            </div>
          </button>
          <p className="text-xs text-gray-500 text-center">
            {Math.round(progress)}%
          </p>
        </div>

        <div className="pt-2">
          <Button variant="secondary" onClick={onClose} className="w-full">
            {getMessage('cancel')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
