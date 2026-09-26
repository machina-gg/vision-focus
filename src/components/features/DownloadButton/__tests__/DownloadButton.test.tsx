import React from 'react';

import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { DownloadButton } from '../DownloadButton';
import { STATUS_RESET_DELAY_MS } from '~/constants/intervals';

const wallpaper = vi.hoisted(() => ({
  downloadWallpaper: vi.fn(),
  getResolutionOptions: vi.fn()
}));

const analytics = vi.hoisted(() => ({
  trackFeatureUse: vi.fn()
}));

vi.mock('~/lib/wallpaper', () => ({
  downloadWallpaper: wallpaper.downloadWallpaper,
  getResolutionOptions: wallpaper.getResolutionOptions
}));

vi.mock('~/lib/analytics', () => ({
  trackFeatureUse: analytics.trackFeatureUse
}));

function refWithElement(): React.RefObject<HTMLElement> {
  return { current: document.createElement('div') };
}

function emptyRef(): React.RefObject<HTMLElement> {
  return { current: null } as React.RefObject<HTMLElement>;
}

const downloadButton = () => screen.getByTestId('newtab-download-button');

function openMenu() {
  fireEvent.click(downloadButton());
}

beforeEach(() => {
  wallpaper.downloadWallpaper.mockReset().mockResolvedValue(undefined);
  wallpaper.getResolutionOptions.mockReset().mockReturnValue([
    { value: '1080p', label: 'Full HD', dimensions: '1920 x 1080' },
    { value: '4k', label: '4K Ultra HD', dimensions: '3840 x 2160' }
  ]);
  analytics.trackFeatureUse.mockReset();
});

describe('DownloadButton', () => {
  describe('初期表示', () => {
    it('ラベルと説明を表示し、解像度メニューは閉じている', () => {
      render(<DownloadButton targetRef={refWithElement()} />);

      expect(screen.getByTestId('newtab-download-button')).toHaveTextContent(
        'download'
      );
      expect(screen.getByTitle('downloadWallpaper')).toBeInTheDocument();
      expect(screen.queryByText('selectResolution')).not.toBeInTheDocument();
    });

    it('disabled ならボタンを押せない', () => {
      render(<DownloadButton targetRef={refWithElement()} disabled />);

      expect(screen.getByTestId('newtab-download-button')).toBeDisabled();
    });

    it('disabled を省略すると押せる', () => {
      render(<DownloadButton targetRef={refWithElement()} />);

      expect(screen.getByTestId('newtab-download-button')).toBeEnabled();
    });
  });

  describe('解像度メニュー', () => {
    it('押すと解像度の選択肢がラベルと寸法つきで並ぶ', () => {
      render(<DownloadButton targetRef={refWithElement()} />);

      openMenu();

      expect(screen.getByText('selectResolution')).toBeInTheDocument();
      expect(screen.getByText('Full HD')).toBeInTheDocument();
      expect(screen.getByText('1920 x 1080')).toBeInTheDocument();
      expect(screen.getByText('4K Ultra HD')).toBeInTheDocument();
      expect(screen.getByText('3840 x 2160')).toBeInTheDocument();
    });

    it('選択肢が 0 件ならメニューの見出しだけを出す', () => {
      wallpaper.getResolutionOptions.mockReturnValue([]);
      render(<DownloadButton targetRef={refWithElement()} />);

      openMenu();

      expect(screen.getByText('selectResolution')).toBeInTheDocument();
      // メニュー内の選択肢が無いので、押せるボタンは本体だけ
      expect(screen.getAllByRole('button')).toHaveLength(1);
    });

    it('もう一度押すと閉じる', () => {
      render(<DownloadButton targetRef={refWithElement()} />);

      openMenu();
      openMenu();

      expect(screen.queryByText('selectResolution')).not.toBeInTheDocument();
    });
  });

  describe('保存', () => {
    it('選んだ解像度で保存され、利用実績が記録される', async () => {
      const targetRef = refWithElement();
      render(<DownloadButton targetRef={targetRef} />);

      openMenu();
      await act(async () => {
        fireEvent.click(screen.getByText('4K Ultra HD'));
      });

      expect(wallpaper.downloadWallpaper).toHaveBeenCalledWith(
        targetRef.current,
        'visionfocus-wallpaper',
        { resolution: '4k', quality: 0.95 }
      );
      expect(analytics.trackFeatureUse).toHaveBeenCalledWith(
        'wallpaper_download'
      );
    });

    it('保存が始まるとメニューは閉じる', async () => {
      render(<DownloadButton targetRef={refWithElement()} />);

      openMenu();
      await act(async () => {
        fireEvent.click(screen.getByText('Full HD'));
      });

      expect(screen.queryByText('selectResolution')).not.toBeInTheDocument();
    });

    it('保存が終わるまでは保存中の状態になり、ボタンを押せない', async () => {
      let finish = () => {};
      wallpaper.downloadWallpaper.mockReturnValue(
        new Promise<void>((resolve) => {
          finish = resolve;
        })
      );
      render(<DownloadButton targetRef={refWithElement()} />);

      openMenu();
      await act(async () => {
        fireEvent.click(screen.getByText('Full HD'));
      });

      expect(downloadButton()).toHaveAttribute('data-downloading', 'true');
      expect(downloadButton()).toBeDisabled();

      await act(async () => {
        finish();
      });

      expect(downloadButton()).toHaveAttribute('data-downloading', 'false');
    });

    it('保存対象が未描画なら保存せず、利用実績も記録しない', async () => {
      render(<DownloadButton targetRef={emptyRef()} />);

      openMenu();
      await act(async () => {
        fireEvent.click(screen.getByText('Full HD'));
      });

      expect(wallpaper.downloadWallpaper).not.toHaveBeenCalled();
      expect(analytics.trackFeatureUse).not.toHaveBeenCalled();
    });
  });

  describe('保存結果の表示', () => {
    it('成功すると状態が成功になる', async () => {
      render(<DownloadButton targetRef={refWithElement()} />);

      openMenu();
      await act(async () => {
        fireEvent.click(screen.getByText('Full HD'));
      });

      expect(downloadButton()).toHaveAttribute(
        'data-download-status',
        'success'
      );
    });

    it('失敗すると状態が失敗になり、利用実績も記録しない', async () => {
      wallpaper.downloadWallpaper.mockRejectedValue(new Error('canvas error'));
      render(<DownloadButton targetRef={refWithElement()} />);

      openMenu();
      await act(async () => {
        fireEvent.click(screen.getByText('Full HD'));
      });

      expect(downloadButton()).toHaveAttribute('data-download-status', 'error');
      expect(analytics.trackFeatureUse).not.toHaveBeenCalled();
    });

    it('保存前の状態は待機中で、保存中でもない', () => {
      render(<DownloadButton targetRef={refWithElement()} />);

      expect(downloadButton()).toHaveAttribute('data-download-status', 'idle');
      expect(downloadButton()).toHaveAttribute('data-downloading', 'false');
    });
  });

  describe('保存結果の読み上げ', () => {
    it('待機中は読み上げ領域を空のまま置いておく', () => {
      render(<DownloadButton targetRef={refWithElement()} />);

      const status = screen.getByTestId('newtab-download-status');
      expect(status).toHaveAttribute('role', 'status');
      expect(status).toHaveTextContent('');
    });

    it('成功すると成功の文言を読み上げ領域に出す', async () => {
      render(<DownloadButton targetRef={refWithElement()} />);

      openMenu();
      await act(async () => {
        fireEvent.click(screen.getByText('Full HD'));
      });

      expect(screen.getByTestId('newtab-download-status')).toHaveTextContent(
        'downloadWallpaperSuccess'
      );
    });

    it('失敗すると失敗の文言を読み上げ領域に出す', async () => {
      wallpaper.downloadWallpaper.mockRejectedValue(new Error('canvas error'));
      render(<DownloadButton targetRef={refWithElement()} />);

      openMenu();
      await act(async () => {
        fireEvent.click(screen.getByText('Full HD'));
      });

      expect(screen.getByTestId('newtab-download-status')).toHaveTextContent(
        'downloadWallpaperError'
      );
    });

    it('保存対象が未描画なら結果の文言は出さない', async () => {
      render(<DownloadButton targetRef={emptyRef()} />);

      openMenu();
      await act(async () => {
        fireEvent.click(screen.getByText('Full HD'));
      });

      expect(screen.getByTestId('newtab-download-status')).toHaveTextContent(
        ''
      );
    });

    it('読み上げ領域は壁紙の撮影から除外する', () => {
      render(<DownloadButton targetRef={refWithElement()} />);

      expect(screen.getByTestId('newtab-download-status')).toHaveAttribute(
        'data-html2canvas-ignore',
        'true'
      );
    });
  });

  describe('結果表示の自動リセット', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('一定時間たつと待機中へ戻り、結果の文言も消える', async () => {
      render(<DownloadButton targetRef={refWithElement()} />);

      openMenu();
      await act(async () => {
        fireEvent.click(screen.getByText('Full HD'));
      });
      expect(downloadButton()).toHaveAttribute(
        'data-download-status',
        'success'
      );

      await act(async () => {
        vi.advanceTimersByTime(STATUS_RESET_DELAY_MS);
      });

      expect(downloadButton()).toHaveAttribute('data-download-status', 'idle');
      expect(screen.getByTestId('newtab-download-status')).toHaveTextContent(
        ''
      );
    });
  });
});
