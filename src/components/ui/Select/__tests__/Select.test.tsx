import React from 'react';

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { Select } from '../Select';

const OPTIONS = [
  { value: 'a', label: 'りんご' },
  { value: 'b', label: 'みかん' }
];

describe('Select', () => {
  describe('選択肢が 0 件のとき', () => {
    it('プレースホルダが無ければ選択肢を 1 つも出さない', () => {
      render(<Select value="" onChange={vi.fn()} options={[]} />);

      expect(screen.getByRole('combobox')).toBeInTheDocument();
      expect(screen.queryAllByRole('option')).toHaveLength(0);
    });

    it('プレースホルダがあればそれだけを出し、選べない', () => {
      render(
        <Select
          value=""
          onChange={vi.fn()}
          options={[]}
          placeholder="選んでください"
        />
      );

      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(1);
      expect(options[0]).toHaveTextContent('選んでください');
      expect(options[0]).toBeDisabled();
    });
  });

  describe('選択肢を渡したとき', () => {
    it('渡した順に label を出す', () => {
      render(<Select value="a" onChange={vi.fn()} options={OPTIONS} />);

      expect(
        screen.getAllByRole('option').map((option) => option.textContent)
      ).toEqual(['りんご', 'みかん']);
    });

    it('value に対応する選択肢が選ばれている', () => {
      render(<Select value="b" onChange={vi.fn()} options={OPTIONS} />);

      expect(screen.getByRole('combobox')).toHaveValue('b');
    });

    it('プレースホルダを渡すと選択肢の先頭に増える', () => {
      render(
        <Select
          value="a"
          onChange={vi.fn()}
          options={OPTIONS}
          placeholder="選んでください"
        />
      );

      expect(
        screen.getAllByRole('option').map((option) => option.textContent)
      ).toEqual(['選んでください', 'りんご', 'みかん']);
    });
  });

  describe('選択を変えたとき', () => {
    it('選んだ選択肢の value で onChange が呼ばれる', () => {
      const onChange = vi.fn();
      render(<Select value="a" onChange={onChange} options={OPTIONS} />);

      fireEvent.change(screen.getByRole('combobox'), {
        target: { value: 'b' }
      });

      expect(onChange).toHaveBeenCalledWith('b');
    });
  });

  describe('無効化したとき', () => {
    it('操作できない', () => {
      const onChange = vi.fn();
      render(
        <Select value="a" onChange={onChange} options={OPTIONS} disabled />
      );

      expect(screen.getByRole('combobox')).toBeDisabled();
    });
  });
});
