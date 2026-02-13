import { describe, expect, it, vi, beforeEach } from 'vitest';

import {
  validateImageFile,
  compressImage,
  getBase64Size,
  formatBytes
} from '~/lib/image';
import { IMAGE_LIMITS } from '~/constants/limits';

// Mock File objects
function createMockFile(
  type: string,
  size: number,
  name: string = 'test.jpg'
): File {
  const blob = new Blob(['x'.repeat(size)], { type });
  return new File([blob], name, { type });
}

describe('validateImageFile', () => {
  it('有効なJPEG画像を受け入れる', () => {
    const file = createMockFile('image/jpeg', 1024 * 1024); // 1MB
    const result = validateImageFile(file);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('有効なPNG画像を受け入れる', () => {
    const file = createMockFile('image/png', 1024 * 1024);
    const result = validateImageFile(file);
    expect(result.valid).toBe(true);
  });

  it('有効なWebP画像を受け入れる', () => {
    const file = createMockFile('image/webp', 1024 * 1024);
    const result = validateImageFile(file);
    expect(result.valid).toBe(true);
  });

  it('サポートされていないファイル形式を拒否する', () => {
    const file = createMockFile('image/gif', 1024 * 1024);
    const result = validateImageFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Unsupported file type');
  });

  it('テキストファイルを拒否する', () => {
    const file = createMockFile('text/plain', 1024);
    const result = validateImageFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Unsupported file type');
  });

  it('最大ファイルサイズを超えるファイルを拒否する', () => {
    const file = createMockFile(
      'image/jpeg',
      IMAGE_LIMITS.MAX_FILE_SIZE + 1024
    );
    const result = validateImageFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('File too large');
    expect(result.error).toContain('5MB'); // MAX_FILE_SIZE is 5MB
  });

  it('ファイルが提供されない場合にエラーを返す', () => {
    const result = validateImageFile(null as unknown as File);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('No file provided');
  });

  it('境界値: 最大ファイルサイズちょうどのファイルを受け入れる', () => {
    const file = createMockFile('image/jpeg', IMAGE_LIMITS.MAX_FILE_SIZE);
    const result = validateImageFile(file);
    expect(result.valid).toBe(true);
  });

  it('境界値: 1バイトオーバーのファイルを拒否する', () => {
    const file = createMockFile(
      'image/jpeg',
      IMAGE_LIMITS.MAX_FILE_SIZE + 1
    );
    const result = validateImageFile(file);
    expect(result.valid).toBe(false);
  });

  it('0バイトのファイルを受け入れる（形式が正しい場合）', () => {
    const file = createMockFile('image/jpeg', 0);
    const result = validateImageFile(file);
    expect(result.valid).toBe(true);
  });
});

describe('compressImage', () => {
  let mockCanvas: HTMLCanvasElement & {
    getContext: ReturnType<typeof vi.fn>;
    toDataURL: ReturnType<typeof vi.fn>;
  };
  let mockContext: CanvasRenderingContext2D & {
    drawImage: ReturnType<typeof vi.fn>;
    fillRect: ReturnType<typeof vi.fn>;
  };
  let mockImage: HTMLImageElement & {
    onload: (() => void) | null;
    onerror: (() => void) | null;
  };

  beforeEach(() => {
    // Mock canvas and context
    mockContext = {
      fillStyle: '',
      fillRect: vi.fn(),
      drawImage: vi.fn()
    } as unknown as CanvasRenderingContext2D & {
      drawImage: ReturnType<typeof vi.fn>;
      fillRect: ReturnType<typeof vi.fn>;
    };

    mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => mockContext),
      toDataURL: vi.fn(() => 'data:image/jpeg;base64,mockBase64Data')
    } as unknown as HTMLCanvasElement & {
      getContext: ReturnType<typeof vi.fn>;
      toDataURL: ReturnType<typeof vi.fn>;
    };

    global.document.createElement = vi.fn((tag: string) => {
      if (tag === 'canvas') return mockCanvas;
      return {};
    }) as unknown as typeof document.createElement;

    // Mock Image
    mockImage = {
      width: 1920,
      height: 1080,
      onload: null,
      onerror: null,
      src: ''
    } as unknown as HTMLImageElement & {
      onload: (() => void) | null;
      onerror: (() => void) | null;
    };

    global.Image = vi.fn(() => mockImage) as unknown as typeof Image;

    // Mock FileReader
    const mockFileReader = {
      onload: null,
      onerror: null,
      readAsDataURL: vi.fn(function (this: FileReader & { onload: ((event: ProgressEvent<FileReader>) => void) | null }) {
        // Simulate successful load
        setTimeout(() => {
          if (this.onload) {
            this.onload({ target: { result: 'data:image/jpeg;base64,test' } } as ProgressEvent<FileReader>);
          }
        }, 0);
      })
    };

    global.FileReader = vi.fn(() => mockFileReader) as unknown as typeof FileReader;

    // Trigger image onload after src is set
    Object.defineProperty(mockImage, 'src', {
      set(_value: string) {
        setTimeout(() => {
          if (mockImage.onload) mockImage.onload();
        }, 0);
      },
      get() {
        return '';
      }
    });
  });

  it('有効な画像を圧縮できる', async () => {
    const file = createMockFile('image/jpeg', 2 * 1024 * 1024); // 2MB
    const result = await compressImage(file);

    expect(result).toMatch(/^data:image\/jpeg;base64,/);
    expect(mockContext.drawImage).toHaveBeenCalled();
  });

  it('無効なファイルを拒否する', async () => {
    const file = createMockFile('text/plain', 1024);

    await expect(compressImage(file)).rejects.toThrow(
      'Unsupported file type'
    );
  });

  it('最大サイズを超えるファイルを拒否する', async () => {
    const file = createMockFile(
      'image/jpeg',
      IMAGE_LIMITS.MAX_FILE_SIZE + 1024
    );

    await expect(compressImage(file)).rejects.toThrow('File too large');
  });

  it('画像の読み込み失敗時にエラーをスローする', async () => {
    const file = createMockFile('image/jpeg', 1024 * 1024);

    // Override mock to trigger error
    Object.defineProperty(mockImage, 'src', {
      set() {
        setTimeout(() => {
          if (mockImage.onerror) mockImage.onerror();
        }, 0);
      }
    });

    await expect(compressImage(file)).rejects.toThrow('Failed to load image');
  });

  it('canvas contextの取得失敗時にエラーをスローする', async () => {
    const file = createMockFile('image/jpeg', 1024 * 1024);
    mockCanvas.getContext = vi.fn(() => null);

    await expect(compressImage(file)).rejects.toThrow(
      'Failed to get canvas context'
    );
  });

  it('カスタム最大サイズでの圧縮', async () => {
    const file = createMockFile('image/jpeg', 1024 * 1024);
    const customMaxSizeMB = 0.5; // 0.5MB

    const result = await compressImage(file, customMaxSizeMB);
    expect(result).toMatch(/^data:image\/jpeg;base64,/);
  });

  it('圧縮不可能なほど大きい画像でエラーをスローする', async () => {
    const file = createMockFile('image/jpeg', 1024 * 1024);

    // Mock toDataURL to return a very large data URL
    const largeData = 'data:image/jpeg;base64,' + 'x'.repeat(10 * 1024 * 1024);
    mockCanvas.toDataURL = vi.fn(() => largeData);

    await expect(compressImage(file, 0.5)).rejects.toThrow(
      'Unable to compress image below'
    );
  });

  it('アスペクト比を維持して最大幅に収める', async () => {
    const file = createMockFile('image/jpeg', 1024 * 1024);
    mockImage.width = 3840; // Exceeds MAX_WIDTH (1920)
    mockImage.height = 2160;

    await compressImage(file);

    // Canvas should be resized to maintain aspect ratio
    expect(mockCanvas.width).toBeLessThanOrEqual(IMAGE_LIMITS.MAX_WIDTH);
    expect(mockCanvas.height).toBeLessThanOrEqual(IMAGE_LIMITS.MAX_HEIGHT);
  });

  it('アスペクト比を維持して最大高さに収める', async () => {
    const file = createMockFile('image/jpeg', 1024 * 1024);
    mockImage.width = 1920;
    mockImage.height = 2160; // Exceeds MAX_HEIGHT (1080)

    await compressImage(file);

    expect(mockCanvas.width).toBeLessThanOrEqual(IMAGE_LIMITS.MAX_WIDTH);
    expect(mockCanvas.height).toBeLessThanOrEqual(IMAGE_LIMITS.MAX_HEIGHT);
  });

  it('小さい画像はリサイズされない', async () => {
    const file = createMockFile('image/jpeg', 1024 * 1024);
    mockImage.width = 800;
    mockImage.height = 600;

    await compressImage(file);

    // Should preserve original dimensions
    expect(mockCanvas.width).toBe(800);
    expect(mockCanvas.height).toBe(600);
  });
});

describe('getBase64Size', () => {
  it('base64データURLのサイズを正しく計算する', () => {
    // Base64: 4 characters = 3 bytes
    const dataUrl = 'data:image/jpeg;base64,AAAA'; // 4 chars = 3 bytes
    const size = getBase64Size(dataUrl);
    expect(size).toBe(3);
  });

  it('パディング付きのbase64データURLのサイズを正しく計算する', () => {
    // With padding (=)
    const dataUrl = 'data:image/jpeg;base64,AAA='; // 3 bytes with 1 padding
    const size = getBase64Size(dataUrl);
    expect(size).toBe(2);
  });

  it('複数パディング付きのbase64データURLのサイズを正しく計算する', () => {
    const dataUrl = 'data:image/jpeg;base64,AA=='; // 1 byte with 2 padding
    const size = getBase64Size(dataUrl);
    expect(size).toBe(1);
  });

  it('大きいbase64データのサイズを計算する', () => {
    // Create a larger base64 string (1KB of data = 1365 base64 chars approx)
    const base64 = 'A'.repeat(1368); // ~1KB
    const dataUrl = `data:image/jpeg;base64,${base64}`;
    const size = getBase64Size(dataUrl);
    expect(size).toBeGreaterThan(1000); // Should be around 1KB
  });

  it('無効なデータURL（プレフィックスなし）で0を返す', () => {
    const size = getBase64Size('invalidDataUrl');
    expect(size).toBe(0);
  });

  it('空のbase64文字列で0を返す', () => {
    const dataUrl = 'data:image/jpeg;base64,';
    const size = getBase64Size(dataUrl);
    expect(size).toBe(0);
  });

  it('異なる画像形式のデータURLでも正しく計算する', () => {
    const dataUrl = 'data:image/png;base64,AAAA';
    const size = getBase64Size(dataUrl);
    expect(size).toBe(3);
  });
});

describe('formatBytes', () => {
  it('バイト単位で表示する（1KB未満）', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(100)).toBe('100 B');
    expect(formatBytes(1023)).toBe('1023 B');
  });

  it('KB単位で表示する（1MB未満）', () => {
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(102400)).toBe('100.0 KB');
    expect(formatBytes(1024 * 1024 - 1)).toBe('1024.0 KB');
  });

  it('MB単位で表示する（1MB以上）', () => {
    expect(formatBytes(1024 * 1024)).toBe('1.0 MB');
    expect(formatBytes(1.5 * 1024 * 1024)).toBe('1.5 MB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB');
    expect(formatBytes(10.25 * 1024 * 1024)).toBe('10.3 MB'); // 10.25 rounds to 10.3
  });

  it('小数点以下1桁で丸める', () => {
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(1587)).toBe('1.5 KB'); // 1.549KB rounds to 1.5KB
    expect(formatBytes(1638)).toBe('1.6 KB');
  });

  it('境界値: 0バイト', () => {
    expect(formatBytes(0)).toBe('0 B');
  });

  it('境界値: 1KB直前', () => {
    expect(formatBytes(1023)).toBe('1023 B');
  });

  it('境界値: 1KB', () => {
    expect(formatBytes(1024)).toBe('1.0 KB');
  });

  it('境界値: 1MB直前', () => {
    expect(formatBytes(1024 * 1024 - 1)).toBe('1024.0 KB');
  });

  it('境界値: 1MB', () => {
    expect(formatBytes(1024 * 1024)).toBe('1.0 MB');
  });

  it('大きいサイズ: 100MB', () => {
    expect(formatBytes(100 * 1024 * 1024)).toBe('100.0 MB');
  });
});
