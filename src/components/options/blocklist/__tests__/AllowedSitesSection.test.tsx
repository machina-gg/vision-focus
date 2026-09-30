import React from 'react';

import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { AllowedSitesSection } from '../AllowedSitesSection';
import { stubI18nWithLocale } from '~/test/i18n';
import { itemAt } from '~/test/items';
import type { AllowedSiteRow } from '~/lib/blockList';

stubI18nWithLocale('ja');

const ROWS: AllowedSiteRow[] = [
  { domain: 'docs.google.com', recordTime: true, exceptionOf: null },
  { domain: 'music.youtube.com', recordTime: false, exceptionOf: 'youtube.com' }
];

function renderSection(
  props: Partial<Parameters<typeof AllowedSitesSection>[0]> = {}
) {
  const handlers = {
    onAdd: vi.fn(async (_input: string) => null as string | null),
    onRemove: vi.fn(),
    onSetRecording: vi.fn()
  };
  render(
    <AllowedSitesSection sites={ROWS} error="" {...handlers} {...props} />
  );
  return { ...handlers, ...props };
}

async function add(value: string) {
  fireEvent.change(screen.getByTestId('allowed-site-input'), {
    target: { value }
  });
  await act(async () => {
    fireEvent.click(screen.getByTestId('allowed-site-add-button'));
  });
}

describe('AllowedSitesSection', () => {
  describe('表示', () => {
    it('見出し・説明・入力欄を出す', () => {
      renderSection();

      expect(screen.getByText('許可サイト')).toBeInTheDocument();
      expect(
        screen.getByText(
          'ブロックしたドメインの中でも、ここに登録したホストは開けます'
        )
      ).toBeInTheDocument();
      expect(screen.getByTestId('allowed-site-input')).toHaveAttribute(
        'placeholder',
        '例: music.youtube.com'
      );
    });

    it('渡された順に行を並べる', () => {
      renderSection();

      expect(
        screen
          .getAllByTestId('allowed-site-item-domain')
          .map((node) => node.textContent)
      ).toEqual(['docs.google.com', 'music.youtube.com']);
    });

    it('1 件も無ければ「許可サイトはありません」を出す', () => {
      renderSection({ sites: [] });

      expect(screen.getByText('許可サイトはありません')).toBeInTheDocument();
      expect(screen.queryAllByTestId('allowed-site-item')).toHaveLength(0);
    });

    it('失敗の文言があれば欄の下に出す', () => {
      renderSection({ error: 'このサイトはブロックリストに登録されています' });

      expect(screen.getByTestId('allowed-site-error')).toHaveTextContent(
        'このサイトはブロックリストに登録されています'
      );
    });

    it('失敗の文言が空なら出さない', () => {
      renderSection();

      expect(
        screen.queryByTestId('allowed-site-error')
      ).not.toBeInTheDocument();
    });
  });

  describe('追加', () => {
    it('入力を onAdd に渡し、追加できたら入力を空にする', async () => {
      const { onAdd } = renderSection();

      await add('mail.google.com');

      expect(onAdd).toHaveBeenCalledWith('mail.google.com');
      expect(screen.getByTestId('allowed-site-input')).toHaveValue('');
    });

    it('拒否されたら入力を残す', async () => {
      renderSection({ onAdd: vi.fn(async () => '追加できません') });

      await add('youtube.com');

      expect(screen.getByTestId('allowed-site-input')).toHaveValue(
        'youtube.com'
      );
    });

    it('空白だけなら onAdd を呼ばない', async () => {
      const { onAdd } = renderSection();

      await add('   ');

      expect(onAdd).not.toHaveBeenCalled();
    });
  });

  describe('行の操作（確認を挟まない）', () => {
    it('削除ボタンで onRemove をそのまま呼ぶ', () => {
      const { onRemove } = renderSection();

      fireEvent.click(
        itemAt(screen.getAllByRole('button', { name: '許可サイトから削除' }), 1)
      );

      expect(onRemove).toHaveBeenCalledWith('music.youtube.com');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('「時間を記録する」で onSetRecording をそのまま呼ぶ', () => {
      const { onSetRecording } = renderSection();

      fireEvent.click(
        itemAt(screen.getAllByTestId('allowed-site-item-record-toggle'), 0)
      );

      expect(onSetRecording).toHaveBeenCalledWith('docs.google.com', false);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
