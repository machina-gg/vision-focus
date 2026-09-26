import { describe, expect, it } from 'vitest';

import { YOUTUBE_DOMAIN } from '~/lib/youtubeBlockService';

describe('YOUTUBE_DOMAIN', () => {
  it('youtube.comが定義されている', () => {
    expect(YOUTUBE_DOMAIN).toBe('youtube.com');
  });
});
