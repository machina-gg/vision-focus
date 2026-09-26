import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ShieldOff, Trash2 } from 'lucide-react';

import { Modal, Button } from '~/components/ui';
import type { UnblockAction } from '~/hooks/useUnblockGuard';
import { getMessage } from '~/lib/i18n';
import type { UnblockHoldSeconds } from '~/types/storage';

const MS_PER_SECOND = 1000;

/** UnblockConfirmModal に渡す開閉状態・解除の対象と操作 */
interface UnblockConfirmModalProps {
  /** false の間は表示しない。閉じると長押しの進み具合を 0 に戻す */
  isOpen: boolean;
  /** 取消ボタンか背景が押されたとき、および解除を確定したあとに呼ぶ */
  onClose: () => void;
  /** ボタンを holdSeconds 秒押し続けたときに呼ぶ */
  onConfirm: () => void;
  /** 解除するサイトのドメイン */
  domain: string;
  /** 現在のブロックのしかたを表す文言（確認文に埋め込む） */
  blockStyle: string;
  /** 削除か無効化か（文言とアイコンを切り替える） */
  action: UnblockAction;
  /** 確定までに押し続けさせる秒数 */
  holdSeconds: UnblockHoldSeconds;
}

/**
 * ブロックの削除・無効化を、ボタンを一定時間押し続けさせてから確定する確認モーダルを表示する
 * @param props 開閉状態・解除の対象と操作（各フィールドは UnblockConfirmModalProps）
 * @returns 長押しの進み具合つきの確認モーダル
 */
export function UnblockConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  domain,
  blockStyle,
  action,
  holdSeconds
}: UnblockConfirmModalProps) {
  const holdDurationMs = holdSeconds * MS_PER_SECOND;
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

  useEffect(() => {
    if (!isOpen) {
      resetProgress();
    }
  }, [isOpen, resetProgress]);

  const updateProgress = useCallback(() => {
    if (startTimeRef.current === null) return;

    const elapsed = Date.now() - startTimeRef.current;
    const newProgress = Math.min((elapsed / holdDurationMs) * 100, 100);
    setProgress(newProgress);

    if (newProgress >= 100) {
      resetProgress();
      onConfirm();
      onClose();
      return;
    }

    animationFrameRef.current = requestAnimationFrame(updateProgress);
  }, [holdDurationMs, onConfirm, onClose, resetProgress]);

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

  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const descriptionKey =
    action === 'delete'
      ? 'deleteBlockConfirmDescription'
      : 'unblockConfirmDescription';
  const description = getMessage(descriptionKey, [domain, String(holdSeconds)]);

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

        <div className="space-y-2">
          <button
            type="button"
            data-testid="unblock-confirm-hold-button"
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerLeave}
            className="relative w-full h-12 overflow-hidden rounded-lg border-2 border-danger-300 bg-danger-50 select-none touch-none cursor-pointer transition-colors hover:border-danger-400"
          >
            <div
              className="absolute inset-y-0 left-0 bg-danger-200 transition-none"
              style={{ width: `${progress}%` }}
            />
            <div className="relative flex items-center justify-center gap-2 h-full">
              <Icon
                className={`w-4 h-4 ${isHolding ? 'text-danger-700' : 'text-danger-500'}`}
              />
              <span
                className={`text-sm font-medium ${isHolding ? 'text-danger-700' : 'text-danger-600'}`}
              >
                {getMessage('unblockConfirmHoldButton')}
                {isHolding &&
                  ` (${Math.ceil(((100 - progress) / 100) * holdSeconds)}s)`}
              </span>
            </div>
          </button>
          <p className="text-xs text-gray-500 text-center">
            {Math.round(progress)}%
          </p>
        </div>

        <div className="pt-2">
          <Button
            variant="secondary"
            onClick={onClose}
            className="w-full"
            data-testid="unblock-confirm-cancel"
          >
            {getMessage('cancel')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
