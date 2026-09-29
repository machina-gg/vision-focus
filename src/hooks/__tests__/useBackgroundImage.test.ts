import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('~/lib/storage', () => ({
  getBackgroundImage: vi.fn()
}));

import { getBackgroundImage } from '~/lib/storage';
import { useBackgroundImage } from '~/hooks/useBackgroundImage';

const JPEG_A = 'data:image/jpeg;base64,/9j/AAAA';
const JPEG_B = 'data:image/jpeg;base64,/9j/BBBB';

const images: Record<string, string> = { 'img-a': JPEG_A, 'img-b': JPEG_B };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getBackgroundImage).mockImplementation(
    async (imageId) => images[imageId] ?? null
  );
});

describe('useBackgroundImage', () => {
  it('ID が null なら読まずに null（画像なし）を返す', () => {
    const { result } = renderHook(() => useBackgroundImage(null));

    expect(result.current).toBeNull();
    expect(getBackgroundImage).not.toHaveBeenCalled();
  });

  it('読み終わるまでは undefined、読み終えたら data URL を返す', async () => {
    const { result } = renderHook(() => useBackgroundImage('img-a'));

    expect(result.current).toBeUndefined();
    await waitFor(() => expect(result.current).toBe(JPEG_A));
    expect(getBackgroundImage).toHaveBeenCalledTimes(1);
  });

  it('画像の無い ID は null（画像なし）を返す', async () => {
    const { result } = renderHook(() => useBackgroundImage('missing'));

    await waitFor(() => expect(result.current).toBeNull());
  });

  it('読めなければ null（画像なし）を返す', async () => {
    vi.mocked(getBackgroundImage).mockRejectedValue(new Error('broken'));
    const { result } = renderHook(() => useBackgroundImage('img-a'));

    await waitFor(() => expect(result.current).toBeNull());
  });

  it('ID が変わったら前の画像を返さず、新しい ID の画像を読む', async () => {
    const { result, rerender } = renderHook(
      ({ imageId }: { imageId: string | null }) => useBackgroundImage(imageId),
      { initialProps: { imageId: 'img-a' as string | null } }
    );
    await waitFor(() => expect(result.current).toBe(JPEG_A));

    rerender({ imageId: 'img-b' });

    expect(result.current).toBeUndefined();
    await waitFor(() => expect(result.current).toBe(JPEG_B));
  });

  it('同じ ID のまま再描画しても読み直さない', async () => {
    const { result, rerender } = renderHook(() => useBackgroundImage('img-a'));
    await waitFor(() => expect(result.current).toBe(JPEG_A));

    rerender();

    expect(getBackgroundImage).toHaveBeenCalledTimes(1);
  });

  it('先に頼んだ画像が後から届いても、今の ID の画像を返す', async () => {
    let resolveA: (value: string | null) => void = () => {};
    vi.mocked(getBackgroundImage).mockImplementation((imageId) =>
      imageId === 'img-a'
        ? new Promise((resolve) => {
            resolveA = resolve;
          })
        : Promise.resolve(JPEG_B)
    );
    const { result, rerender } = renderHook(
      ({ imageId }: { imageId: string }) => useBackgroundImage(imageId),
      { initialProps: { imageId: 'img-a' } }
    );

    rerender({ imageId: 'img-b' });
    await waitFor(() => expect(result.current).toBe(JPEG_B));
    resolveA(JPEG_A);
    await Promise.resolve();

    expect(result.current).toBe(JPEG_B);
  });
});
