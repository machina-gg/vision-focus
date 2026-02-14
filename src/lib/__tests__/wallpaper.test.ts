import { describe, expect, it } from 'vitest';

import { getResolutionOptions, getResolutionDimensions } from '~/lib/wallpaper';

describe('getResolutionOptions', () => {
  it('3つの解像度オプションを返す', () => {
    const options = getResolutionOptions();
    expect(options).toHaveLength(3);
  });

  it('1080pオプションを含む', () => {
    const options = getResolutionOptions();
    const fhd = options.find((o) => o.value === '1080p');
    expect(fhd).toBeTruthy();
    expect(fhd!.label).toBe('Full HD');
    expect(fhd!.dimensions).toBe('1920 x 1080');
  });

  it('1440pオプションを含む', () => {
    const options = getResolutionOptions();
    const qhd = options.find((o) => o.value === '1440p');
    expect(qhd).toBeTruthy();
    expect(qhd!.label).toBe('Quad HD');
    expect(qhd!.dimensions).toBe('2560 x 1440');
  });

  it('4Kオプションを含む', () => {
    const options = getResolutionOptions();
    const uhd = options.find((o) => o.value === '4k');
    expect(uhd).toBeTruthy();
    expect(uhd!.label).toBe('4K Ultra HD');
    expect(uhd!.dimensions).toBe('3840 x 2160');
  });
});

describe('getResolutionDimensions', () => {
  it('1080pの解像度を返す', () => {
    const dims = getResolutionDimensions('1080p');
    expect(dims).toEqual({ width: 1920, height: 1080 });
  });

  it('1440pの解像度を返す', () => {
    const dims = getResolutionDimensions('1440p');
    expect(dims).toEqual({ width: 2560, height: 1440 });
  });

  it('4Kの解像度を返す', () => {
    const dims = getResolutionDimensions('4k');
    expect(dims).toEqual({ width: 3840, height: 2160 });
  });
});
