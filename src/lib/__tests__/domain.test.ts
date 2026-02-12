import { describe, expect, it } from 'vitest';

import { matchesDomain, extractDomain } from '~/lib/domain';
import type { BlockItem } from '~/types/storage';

function makeBlockItem(domain: string, isWildcard: boolean): BlockItem {
  return {
    id: 'test-id',
    domain,
    isWildcard,
    createdAt: '2024-01-01T00:00:00Z',
    enabled: true
  };
}

describe('matchesDomain', () => {
  describe('exact (non-wildcard) domains', () => {
    it('matches exact domain', () => {
      const item = makeBlockItem('youtube.com', false);
      expect(matchesDomain('youtube.com', item)).toBe(true);
    });

    it('matches subdomain of the blocked domain', () => {
      const item = makeBlockItem('youtube.com', false);
      expect(matchesDomain('www.youtube.com', item)).toBe(true);
    });

    it('matches nested subdomain', () => {
      const item = makeBlockItem('youtube.com', false);
      expect(matchesDomain('m.youtube.com', item)).toBe(true);
    });

    it('does not match unrelated domain with same suffix', () => {
      const item = makeBlockItem('youtube.com', false);
      expect(matchesDomain('notyoutube.com', item)).toBe(false);
    });

    it('does not match a different domain entirely', () => {
      const item = makeBlockItem('youtube.com', false);
      expect(matchesDomain('reddit.com', item)).toBe(false);
    });

    it('matches case-insensitively', () => {
      const item = makeBlockItem('YouTube.com', false);
      expect(matchesDomain('WWW.YOUTUBE.COM', item)).toBe(true);
    });

    it('www.youtube.com does not match youtube.com tab', () => {
      const item = makeBlockItem('www.youtube.com', false);
      expect(matchesDomain('youtube.com', item)).toBe(false);
    });

    it('www.youtube.com matches www.youtube.com exactly', () => {
      const item = makeBlockItem('www.youtube.com', false);
      expect(matchesDomain('www.youtube.com', item)).toBe(true);
    });
  });

  describe('wildcard domains', () => {
    it('matches subdomain', () => {
      const item = makeBlockItem('*.youtube.com', true);
      expect(matchesDomain('www.youtube.com', item)).toBe(true);
    });

    it('matches base domain', () => {
      const item = makeBlockItem('*.youtube.com', true);
      expect(matchesDomain('youtube.com', item)).toBe(true);
    });

    it('matches nested subdomain', () => {
      const item = makeBlockItem('*.youtube.com', true);
      expect(matchesDomain('sub.www.youtube.com', item)).toBe(true);
    });

    it('does not match unrelated domain', () => {
      const item = makeBlockItem('*.youtube.com', true);
      expect(matchesDomain('notyoutube.com', item)).toBe(false);
    });
  });
});

describe('extractDomain', () => {
  it('extracts hostname from HTTPS URL', () => {
    expect(extractDomain('https://www.youtube.com/watch?v=abc')).toBe(
      'www.youtube.com'
    );
  });

  it('extracts hostname from HTTP URL', () => {
    expect(extractDomain('http://reddit.com/r/all')).toBe('reddit.com');
  });

  it('returns null for invalid URL', () => {
    expect(extractDomain('not-a-url')).toBeNull();
  });
});
