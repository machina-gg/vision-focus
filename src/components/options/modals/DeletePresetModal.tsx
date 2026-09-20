import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';

import { Button, Modal } from '~/components/ui';
import { getMessage } from '~/lib/i18n';

interface DeletePresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  /** 削除しようとしているスタイルを参照しているスケジュールの件数 */
  scheduleCount: number;
}

/**
 * スタイル削除の確認モーダル。
 *
 * 参照しているスケジュールが 1 件以上あるときだけ開く（#333）。
 * スケジュール自体は残り、スタイル連携（presetId）だけが外れることを伝える。
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
