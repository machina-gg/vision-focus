import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';

import { Button, Modal } from '~/components/ui';
import { getMessage } from '~/lib/i18n';

/** DeletePresetModal に渡す開閉状態と削除の操作 */
interface DeletePresetModalProps {
  /** false の間は表示しない */
  isOpen: boolean;
  /** 取消ボタンか背景が押されたときに呼ぶ */
  onClose: () => void;
  /** 削除ボタンが押されたときに呼ぶ */
  onConfirm: () => void;
  /** 削除するプリセットを使っているスケジュールの数（削除してもスケジュールは残る旨と一緒に出す） */
  scheduleCount: number;
}

/**
 * プリセットを削除してよいかを、そのプリセットを使うスケジュールの数とともに確認するモーダルを表示する
 * @param props 開閉状態と削除の操作（各フィールドは DeletePresetModalProps）
 * @returns 削除の確認モーダル
 */
export function DeletePresetModal({
  isOpen,
  onClose,
  onConfirm,
  scheduleCount
}: DeletePresetModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={getMessage('deletePresetConfirm')}
      size="sm"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-4 bg-warning-50 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-warning-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p
              className="text-sm text-warning-800"
              data-testid="delete-preset-schedule-count"
            >
              {getMessage('deletePresetLinkedSchedules', String(scheduleCount))}
            </p>
            <p className="text-xs text-warning-600">
              {getMessage('deletePresetScheduleKept')}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="secondary"
            onClick={onClose}
            data-testid="delete-preset-cancel"
          >
            {getMessage('cancel')}
          </Button>
          <Button
            variant="danger"
            onClick={onConfirm}
            data-testid="delete-preset-confirm"
          >
            <Trash2 className="w-4 h-4" />
            {getMessage('delete')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
