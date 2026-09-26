import React from 'react';

import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { ImageUploader } from '../ImageUploader';

const image = vi.hoisted(() => ({
  validateImageFile: vi.fn(),
  compressImage: vi.fn()
}));

const analytics = vi.hoisted(() => ({
  trackFeatureUse: vi.fn(),
  trackError: vi.fn()
}));

vi.mock('~/lib/image', () => ({
  validateImageFile: image.validateImageFile,
  compressImage: image.compressImage
}));

vi.mock('~/lib/analytics', () => ({
  trackFeatureUse: analytics.trackFeatureUse,
  trackError: analytics.trackError
}));

const pngFile = () =>
  new File(['binary'], 'wallpaper.png', { type: 'image/png' });

const dropzone = () => screen.getByTestId('style-bg-upload-dropzone');
const fileInput = () => screen.getByTestId('style-bg-upload');

async function selectFile(file: File = pngFile()) {
  await act(async () => {
    fireEvent.change(fileInput(), { target: { files: [file] } });
  });
}

beforeEach(() => {
  image.validateImageFile.mockReset().mockReturnValue({ valid: true });
  image.compressImage.mockReset().mockResolvedValue('data:image/png;base64,ok');
  analytics.trackFeatureUse.mockReset();
  analytics.trackError.mockReset();
});

describe('ImageUploader', () => {
  describe('画像が設定済みのとき', () => {
    it('その画像を表示し、ドロップゾーンは出さない', () => {
      render(
        <ImageUploader value="data:image/png;base64,saved" onChange={vi.fn()} />
      );

      expect(screen.getByRole('img')).toHaveAttribute(
        'src',
        'data:image/png;base64,saved'
      );
      expect(screen.getByText('uploadedImage')).toBeInTheDocument();
      expect(
        screen.queryByTestId('style-bg-upload-dropzone')
      ).not.toBeInTheDocument();
    });

    it('削除ボタンを押すと null が渡る', () => {
      const onChange = vi.fn();
      render(
        <ImageUploader
          value="data:image/png;base64,saved"
          onChange={onChange}
        />
      );

      fireEvent.click(screen.getByTitle('remove'));

      expect(onChange).toHaveBeenCalledWith(null);
    });

    it('disabled なら削除ボタンを出さない', () => {
      render(
        <ImageUploader
          value="data:image/png;base64,saved"
          onChange={vi.fn()}
          disabled
        />
      );

      expect(screen.queryByTitle('remove')).not.toBeInTheDocument();
    });
  });

  describe('画像が未設定のとき', () => {
    it('ドロップゾーンと対応形式の案内を出す', () => {
      render(<ImageUploader value={null} onChange={vi.fn()} />);

      expect(dropzone()).toBeInTheDocument();
      expect(screen.getByText('uploadImage')).toBeInTheDocument();
      expect(screen.getByText('supportedFormats')).toBeInTheDocument();
    });

    it('空文字も未設定として扱う', () => {
      render(<ImageUploader value="" onChange={vi.fn()} />);

      expect(dropzone()).toBeInTheDocument();
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    it('ドロップゾーンを押すとファイル選択欄が開く', () => {
      const click = vi.spyOn(HTMLInputElement.prototype, 'click');
      render(<ImageUploader value={null} onChange={vi.fn()} />);

      fireEvent.click(dropzone());

      expect(click).toHaveBeenCalledTimes(1);
      click.mockRestore();
    });

    it('disabled ならファイル選択欄を開かない', () => {
      const click = vi.spyOn(HTMLInputElement.prototype, 'click');
      render(<ImageUploader value={null} onChange={vi.fn()} disabled />);

      fireEvent.click(dropzone());

      expect(click).not.toHaveBeenCalled();
      click.mockRestore();
    });
  });

  describe('ドラッグ中の表示', () => {
    it('ドラッグが入るとドロップを促す文言に変わる', () => {
      render(<ImageUploader value={null} onChange={vi.fn()} />);

      fireEvent.dragEnter(dropzone());

      expect(screen.getByText('dropImage')).toBeInTheDocument();
      expect(screen.queryByText('uploadImage')).not.toBeInTheDocument();
    });

    it('ドラッグが外れると元の文言に戻る', () => {
      render(<ImageUploader value={null} onChange={vi.fn()} />);

      fireEvent.dragEnter(dropzone());
      fireEvent.dragLeave(dropzone());

      expect(screen.getByText('uploadImage')).toBeInTheDocument();
    });
  });

  describe('取り込み', () => {
    it('検証を通れば圧縮した結果が渡り、利用実績も記録される', async () => {
      const onChange = vi.fn();
      render(<ImageUploader value={null} onChange={onChange} />);

      await selectFile();

      expect(onChange).toHaveBeenCalledWith('data:image/png;base64,ok');
      expect(analytics.trackFeatureUse).toHaveBeenCalledWith('image_upload');
    });

    it('maxSizeMB は既定で 1MB が圧縮に渡る', async () => {
      const file = pngFile();
      render(<ImageUploader value={null} onChange={vi.fn()} />);

      await selectFile(file);

      expect(image.compressImage).toHaveBeenCalledWith(file, 1);
    });

    it('maxSizeMB を渡すとその値が圧縮に渡る', async () => {
      const file = pngFile();
      render(<ImageUploader value={null} onChange={vi.fn()} maxSizeMB={3} />);

      await selectFile(file);

      expect(image.compressImage).toHaveBeenCalledWith(file, 3);
    });

    it('ファイルを選ばなかったときは何もしない', async () => {
      const onChange = vi.fn();
      render(<ImageUploader value={null} onChange={onChange} />);

      await act(async () => {
        fireEvent.change(fileInput(), { target: { files: [] } });
      });

      expect(image.validateImageFile).not.toHaveBeenCalled();
      expect(onChange).not.toHaveBeenCalled();
    });

    it('ドロップでも同じように取り込む', async () => {
      const onChange = vi.fn();
      const file = pngFile();
      render(<ImageUploader value={null} onChange={onChange} />);

      await act(async () => {
        fireEvent.drop(dropzone(), { dataTransfer: { files: [file] } });
      });

      expect(image.compressImage).toHaveBeenCalledWith(file, 1);
      expect(onChange).toHaveBeenCalledWith('data:image/png;base64,ok');
    });

    it('disabled ならドロップしても取り込まない', async () => {
      const onChange = vi.fn();
      render(<ImageUploader value={null} onChange={onChange} disabled />);

      await act(async () => {
        fireEvent.drop(dropzone(), { dataTransfer: { files: [pngFile()] } });
      });

      expect(image.compressImage).not.toHaveBeenCalled();
      expect(onChange).not.toHaveBeenCalled();
    });

    it('ドロップ中の表示はドロップ後に戻る', async () => {
      render(<ImageUploader value={null} onChange={vi.fn()} />);

      fireEvent.dragEnter(dropzone());
      await act(async () => {
        fireEvent.drop(dropzone(), { dataTransfer: { files: [pngFile()] } });
      });

      expect(screen.queryByText('dropImage')).not.toBeInTheDocument();
    });
  });

  describe('取り込みの失敗', () => {
    it('検証で弾かれたら理由を表示し、保存しない', async () => {
      image.validateImageFile.mockReturnValue({
        valid: false,
        error: 'Unsupported file type.'
      });
      const onChange = vi.fn();
      render(<ImageUploader value={null} onChange={onChange} />);

      await selectFile();

      expect(screen.getByText('Unsupported file type.')).toBeInTheDocument();
      expect(image.compressImage).not.toHaveBeenCalled();
      expect(onChange).not.toHaveBeenCalled();
    });

    it('検証が理由を返さなければ既定の文言を出す', async () => {
      image.validateImageFile.mockReturnValue({ valid: false });
      render(<ImageUploader value={null} onChange={vi.fn()} />);

      await selectFile();

      expect(screen.getByText('Invalid file')).toBeInTheDocument();
    });

    it('圧縮が失敗したら理由を表示し、失敗を記録する', async () => {
      image.compressImage.mockRejectedValue(new Error('too large'));
      const onChange = vi.fn();
      render(<ImageUploader value={null} onChange={onChange} />);

      await selectFile();

      expect(screen.getByText('too large')).toBeInTheDocument();
      expect(analytics.trackError).toHaveBeenCalledWith('image_upload_failed');
      expect(onChange).not.toHaveBeenCalled();
    });

    it('理由が Error でなければ既定の文言を出す', async () => {
      image.compressImage.mockRejectedValue('boom');
      render(<ImageUploader value={null} onChange={vi.fn()} />);

      await selectFile();

      expect(screen.getByText('Failed to process image')).toBeInTheDocument();
    });

    it('選び直すとエラー表示は消える', async () => {
      image.validateImageFile.mockReturnValue({
        valid: false,
        error: 'Unsupported file type.'
      });
      render(<ImageUploader value={null} onChange={vi.fn()} />);
      await selectFile();
      expect(screen.getByText('Unsupported file type.')).toBeInTheDocument();

      image.validateImageFile.mockReturnValue({ valid: true });
      await selectFile();

      expect(
        screen.queryByText('Unsupported file type.')
      ).not.toBeInTheDocument();
    });
  });

  describe('処理中の表示', () => {
    it('圧縮が終わるまで処理中と出し、終わったら消える', async () => {
      let finish: (dataUrl: string) => void = () => undefined;
      image.compressImage.mockReturnValue(
        new Promise<string>((resolve) => {
          finish = resolve;
        })
      );
      render(<ImageUploader value={null} onChange={vi.fn()} />);

      await selectFile();
      expect(screen.getByText('processing')).toBeInTheDocument();
      expect(screen.queryByText('uploadImage')).not.toBeInTheDocument();

      await act(async () => {
        finish('data:image/png;base64,ok');
      });

      expect(screen.queryByText('processing')).not.toBeInTheDocument();
    });
  });
});
