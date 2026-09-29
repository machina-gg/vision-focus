import React from 'react';

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { NewPresetModal } from '../NewPresetModal';

const baseProps = {
  isOpen: true,
  onClose: vi.fn(),
  presetName: '朝',
  onPresetNameChange: vi.fn(),
  onCreate: vi.fn()
};

describe('NewPresetModal', () => {
  it('error があれば出す', () => {
    render(<NewPresetModal {...baseProps} error="上限に達しています" />);

    expect(screen.getByTestId('new-preset-error')).toHaveTextContent(
      '上限に達しています'
    );
  });

  it('error が無ければ何も出さない', () => {
    render(<NewPresetModal {...baseProps} />);

    expect(screen.queryByTestId('new-preset-error')).not.toBeInTheDocument();
  });

  it('名前が空白だけなら追加ボタンを押せない', () => {
    render(<NewPresetModal {...baseProps} presetName="   " />);

    expect(screen.getByTestId('new-preset-confirm')).toBeDisabled();
  });

  it('追加ボタンで onCreate を呼ぶ', () => {
    const onCreate = vi.fn();
    render(<NewPresetModal {...baseProps} onCreate={onCreate} />);

    fireEvent.click(screen.getByTestId('new-preset-confirm'));

    expect(onCreate).toHaveBeenCalledTimes(1);
  });
});
