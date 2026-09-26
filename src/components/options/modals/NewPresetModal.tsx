import React from 'react';
import { Plus } from 'lucide-react';

import { Button, Input, Modal } from '~/components/ui';
import { getMessage } from '~/lib/i18n';

/** NewPresetModal に渡す開閉状態・入力中の名前と操作 */
interface NewPresetModalProps {
  /** false の間は表示しない */
  isOpen: boolean;
  /** 閉じるときに呼ぶ（続けて名前を空に戻す） */
  onClose: () => void;
  /** 入力中のプリセット名（空白だけなら追加ボタンを押せない） */
  presetName: string;
  /** 名前の入力が変わったときに受け取る */
  onPresetNameChange: (name: string) => void;
  /** 追加ボタンが押されたときに呼ぶ */
  onCreate: () => void;
}

/**
 * 新しいプリセットの名前を入力させて追加するモーダルを表示する
 * @param props 開閉状態・入力中の名前と操作（各フィールドは NewPresetModalProps）
 * @returns プリセット追加のモーダル
 */
export function NewPresetModal({
  isOpen,
  onClose,
  presetName,
  onPresetNameChange,
  onCreate
}: NewPresetModalProps) {
  const handleClose = () => {
    onClose();
    onPresetNameChange('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={getMessage('newPreset')}
      size="sm"
    >
      <div className="space-y-4">
        <Input
          data-testid="new-preset-name-input"
          value={presetName}
          onChange={onPresetNameChange}
          placeholder={getMessage('presetNamePlaceholder')}
        />
        <div className="flex justify-end gap-2">
          <Button
            variant="secondary"
            onClick={handleClose}
            data-testid="new-preset-cancel"
          >
            {getMessage('cancel')}
          </Button>
          <Button
            onClick={onCreate}
            disabled={!presetName.trim()}
            data-testid="new-preset-confirm"
          >
            <Plus className="w-4 h-4" />
            {getMessage('add')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
