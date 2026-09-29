import React from 'react';

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { AllowHostButton } from '../AllowHostButton';
import { stubI18nWithSubstitutions } from '~/test/i18n';

stubI18nWithSubstitutions();

describe('AllowHostButton', () => {
  it('ホスト名を入れたボタンを出す', () => {
    render(<AllowHostButton host="music.youtube.com" onAllow={vi.fn()} />);

    expect(screen.getByTestId('newtab-allow-host-button')).toHaveTextContent(
      'allowHost(music.youtube.com)'
    );
  });

  it('押すと確認なしで onAllow を 1 回呼ぶ', async () => {
    const onAllow = vi.fn(async () => null);
    render(<AllowHostButton host="music.youtube.com" onAllow={onAllow} />);

    fireEvent.click(screen.getByTestId('newtab-allow-host-button'));

    await screen.findByTestId('newtab-allow-host-done');
    expect(onAllow).toHaveBeenCalledTimes(1);
  });

  it('成功したらボタンを消し、完了の文言とホストを開くリンクを出す', async () => {
    render(
      <AllowHostButton host="music.youtube.com" onAllow={async () => null} />
    );

    fireEvent.click(screen.getByTestId('newtab-allow-host-button'));

    expect(
      await screen.findByTestId('newtab-allow-host-done')
    ).toHaveTextContent('allowHostDone(music.youtube.com)');
    const link = screen.getByTestId('newtab-allow-host-open');
    expect(link).toHaveAttribute('href', 'https://music.youtube.com/');
    expect(link).toHaveTextContent('openAllowedHost');
    expect(screen.queryByTestId('newtab-allow-host-button')).toBeNull();
  });

  it('失敗したら返された文言を出し、ボタンを残す', async () => {
    render(
      <AllowHostButton
        host="music.youtube.com"
        onAllow={async () => '追加できません'}
      />
    );

    fireEvent.click(screen.getByTestId('newtab-allow-host-button'));

    expect(
      await screen.findByTestId('newtab-allow-host-error')
    ).toHaveTextContent('追加できません');
    expect(screen.getByTestId('newtab-allow-host-button')).toBeEnabled();
    expect(screen.queryByTestId('newtab-allow-host-done')).toBeNull();
  });

  it('送っている間はボタンを押せない', async () => {
    let finish: (value: string | null) => void = () => {};
    const onAllow = vi.fn(
      () =>
        new Promise<string | null>((resolve) => {
          finish = resolve;
        })
    );
    render(<AllowHostButton host="music.youtube.com" onAllow={onAllow} />);

    fireEvent.click(screen.getByTestId('newtab-allow-host-button'));

    expect(screen.getByTestId('newtab-allow-host-button')).toBeDisabled();
    finish(null);
    await screen.findByTestId('newtab-allow-host-done');
  });
});
