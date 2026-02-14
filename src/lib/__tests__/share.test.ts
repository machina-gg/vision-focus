import { describe, expect, it, vi } from 'vitest';

import { generateShareText, shareToX, downloadImage } from '~/lib/share';

describe('generateShareText', () => {
  it('ヘッダーとハッシュタグを含む', () => {
    const text = generateShareText({
      totalBlockCount: 0,
      totalWasteTime: 0
    });
    expect(text).toContain('VisionFocus Report');
    expect(text).toContain('#VisionFocus');
    expect(text).toContain('#productivity');
  });

  it('ブロック回数を含む', () => {
    const text = generateShareText({
      totalBlockCount: 42,
      totalWasteTime: 0
    });
    expect(text).toContain('42 times');
  });

  it('ブロック回数が0の場合はBlockedを含まない', () => {
    const text = generateShareText({
      totalBlockCount: 0,
      totalWasteTime: 100
    });
    expect(text).not.toContain('Blocked');
  });

  it('ウェイスト時間を含む', () => {
    const text = generateShareText({
      totalBlockCount: 0,
      totalWasteTime: 3600
    });
    expect(text).toContain('Waste Time');
  });

  it('ウェイスト時間が0の場合はWaste Timeを含まない', () => {
    const text = generateShareText({
      totalBlockCount: 5,
      totalWasteTime: 0
    });
    expect(text).not.toContain('Waste Time');
  });

  it('wasteTimeChangePercentを含む（正の変化）', () => {
    const text = generateShareText({
      totalBlockCount: 10,
      totalWasteTime: 100,
      wasteTimeChangePercent: 25.5
    });
    expect(text).toContain('+25.5%');
  });

  it('wasteTimeChangePercentを含む（負の変化）', () => {
    const text = generateShareText({
      totalBlockCount: 10,
      totalWasteTime: 100,
      wasteTimeChangePercent: -15.3
    });
    expect(text).toContain('-15.3%');
  });

  it('wasteTimeChangePercentがnullの場合は表示しない', () => {
    const text = generateShareText({
      totalBlockCount: 10,
      totalWasteTime: 100,
      wasteTimeChangePercent: null
    });
    expect(text).not.toContain('vs Previous');
  });

  it('topBlockedSiteを含む', () => {
    const text = generateShareText({
      totalBlockCount: 10,
      totalWasteTime: 100,
      topBlockedSite: 'youtube.com'
    });
    expect(text).toContain('youtube.com');
    expect(text).toContain('Top Blocked');
  });

  it('topBlockedSiteがない場合はTop Blockedを含まない', () => {
    const text = generateShareText({
      totalBlockCount: 10,
      totalWasteTime: 100
    });
    expect(text).not.toContain('Top Blocked');
  });
});

describe('shareToX', () => {
  it('Twitter intentのURLでwindow.openを呼ぶ', () => {
    const mockOpen = vi.fn();
    vi.stubGlobal('open', mockOpen);

    shareToX('Hello World');
    expect(mockOpen).toHaveBeenCalledWith(
      expect.stringContaining('twitter.com/intent/tweet'),
      '_blank',
      'noopener,noreferrer'
    );

    vi.unstubAllGlobals();
  });

  it('テキストがURLエンコードされている', () => {
    const mockOpen = vi.fn();
    vi.stubGlobal('open', mockOpen);

    shareToX('テスト & test');
    const calledUrl = mockOpen.mock.calls[0][0] as string;
    expect(calledUrl).toContain(encodeURIComponent('テスト & test'));

    vi.unstubAllGlobals();
  });
});

describe('downloadImage', () => {
  it('canvasからダウンロードリンクを作成してクリックする', () => {
    const mockClick = vi.fn();
    const mockCanvas = {
      toDataURL: vi.fn(() => 'data:image/png;base64,test')
    } as unknown as HTMLCanvasElement;

    // document.createElementをモック
    const mockLink = {
      download: '',
      href: '',
      click: mockClick
    };
    vi.spyOn(document, 'createElement').mockReturnValue(
      mockLink as unknown as HTMLAnchorElement
    );

    downloadImage(mockCanvas, 'test.png');

    expect(mockCanvas.toDataURL).toHaveBeenCalledWith('image/png', 1.0);
    expect(mockLink.download).toBe('test.png');
    expect(mockLink.href).toBe('data:image/png;base64,test');
    expect(mockClick).toHaveBeenCalled();

    vi.restoreAllMocks();
  });

  it('canvasのtoDataURLがエラーの場合は例外を投げる', () => {
    const mockCanvas = {
      toDataURL: vi.fn(() => {
        throw new Error('Canvas error');
      })
    } as unknown as HTMLCanvasElement;

    expect(() => downloadImage(mockCanvas, 'test.png')).toThrow('Canvas error');
  });
});
