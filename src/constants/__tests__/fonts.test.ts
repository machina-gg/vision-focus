import { describe, it, expect, afterEach } from 'vitest';

import { loadGoogleFont } from '../fonts';

afterEach(() => {
  document
    .querySelectorAll('link[id^="google-font-"]')
    .forEach((link) => link.remove());
});

describe('loadGoogleFont', () => {
  it('選べる太さだけを昇順で読み込む', () => {
    loadGoogleFont('Open+Sans');

    const link = document.getElementById('google-font-Open-Sans');
    expect(link?.getAttribute('href')).toBe(
      'https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;700&display=swap'
    );
  });

  it('同じフォントを二度読み込まない', () => {
    loadGoogleFont('Inter');
    loadGoogleFont('Inter');

    expect(
      document.querySelectorAll('link[id="google-font-Inter"]')
    ).toHaveLength(1);
  });
});
