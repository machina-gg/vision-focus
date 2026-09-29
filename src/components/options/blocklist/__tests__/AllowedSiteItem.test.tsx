import React from 'react';

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { AllowedSiteItem } from '../AllowedSiteItem';
import { stubI18nWithLocale } from '~/test/i18n';
import type { AllowedSiteRow } from '~/lib/blockList';

stubI18nWithLocale('ja');

function renderItem(site: Partial<AllowedSiteRow> = {}) {
  const onRemove = vi.fn();
  const onSetRecording = vi.fn();
  render(
    <AllowedSiteItem
      site={{
        domain: 'music.youtube.com',
        recordTime: false,
        exceptionOf: 'youtube.com',
        ...site
      }}
      onRemove={onRemove}
      onSetRecording={onSetRecording}
    />
  );
  return { onRemove, onSetRecording };
}

describe('AllowedSiteItem', () => {
  describe('補足', () => {
    it('覆うブロックがあれば「<ブロック> の例外」を出す', () => {
      renderItem({ exceptionOf: 'youtube.com' });

      expect(screen.getByTestId('allowed-site-item-domain')).toHaveTextContent(
        'music.youtube.com'
      );
      expect(screen.getByTestId('allowed-site-item-note')).toHaveTextContent(
        'youtube.com の例外'
      );
    });

    it('覆うブロックが無ければ「かかっているブロックはありません」を出す', () => {
      renderItem({ exceptionOf: null });

      expect(screen.getByTestId('allowed-site-item-note')).toHaveTextContent(
        'かかっているブロックはありません'
      );
    });
  });

  describe('「時間を記録する」', () => {
    it.each([false, true])(
      '記録の状態 %s をスイッチに映し、押すと反転した値で onSetRecording を呼ぶ',
      (recordTime) => {
        const { onSetRecording } = renderItem({ recordTime });
        const toggle = screen.getByTestId('allowed-site-item-record-toggle');

        expect(toggle).toHaveAttribute('aria-checked', String(recordTime));
        expect(screen.getByText('時間を記録する')).toBeInTheDocument();

        fireEvent.click(toggle);

        expect(onSetRecording).toHaveBeenCalledWith(
          'music.youtube.com',
          !recordTime
        );
      }
    );
  });

  describe('削除', () => {
    it('削除ボタンを押すと onRemove(ドメイン) を呼ぶ', () => {
      const { onRemove } = renderItem();

      fireEvent.click(
        screen.getByRole('button', { name: '許可サイトから削除' })
      );

      expect(onRemove).toHaveBeenCalledWith('music.youtube.com');
    });
  });
});
