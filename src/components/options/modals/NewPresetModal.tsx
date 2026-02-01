import React from 'react';
import { Plus } from 'lucide-react';

import { Button, Input, Modal } from '~/components/ui';
import { getMessage } from '~/lib/i18n';

interface NewPresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  presetName: string;
  onPresetNameChange: (name: string) => void;
  onCreate: () => void;
}

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
          value={presetName}
          onChange={onPresetNameChange}
          placeholder={getMessage('presetNamePlaceholder')}
        />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={handleClose}>
            {getMessage('cancel')}
          </Button>
          <Button onClick={onCreate} disabled={!presetName.trim()}>
            <Plus className="w-4 h-4" />
            {getMessage('add')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
