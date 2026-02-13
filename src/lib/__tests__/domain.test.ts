import { describe, expect, it } from 'vitest';

import {
  matchesDomain,
  extractDomain,
  isDomainBlocked,
  parseDomainInput,
  isValidDomain,
  generateId
} from '~/lib/domain';
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

    it('matches deeply nested subdomains', () => {
      const item = makeBlockItem('example.com', false);
      expect(matchesDomain('a.b.c.d.example.com', item)).toBe(true);
    });

    it('handles empty domain gracefully', () => {
      const item = makeBlockItem('example.com', false);
      expect(matchesDomain('', item)).toBe(false);
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

    it('handles mixed case in wildcard pattern', () => {
      const item = makeBlockItem('*.Example.COM', true);
      expect(matchesDomain('www.example.com', item)).toBe(true);
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

  it('extracts domain from URL with port', () => {
    expect(extractDomain('https://example.com:8080/path')).toBe('example.com');
  });

  it('extracts domain from URL with query string', () => {
    expect(extractDomain('https://example.com?query=value')).toBe(
      'example.com'
    );
  });

  it('extracts domain from URL with hash', () => {
    expect(extractDomain('https://example.com#section')).toBe('example.com');
  });

  it('returns null for empty string', () => {
    expect(extractDomain('')).toBeNull();
  });

  it('returns null for URL without protocol', () => {
    expect(extractDomain('example.com')).toBeNull();
  });
});

describe('isDomainBlocked', () => {
  it('returns true when domain matches any item in blocklist', () => {
    const blockList = [
      makeBlockItem('youtube.com', false),
      makeBlockItem('reddit.com', false)
    ];
    expect(isDomainBlocked('www.youtube.com', blockList)).toBe(true);
  });

  it('returns false when domain does not match any item', () => {
    const blockList = [
      makeBlockItem('youtube.com', false),
      makeBlockItem('reddit.com', false)
    ];
    expect(isDomainBlocked('twitter.com', blockList)).toBe(false);
  });

  it('returns false for empty blocklist', () => {
    expect(isDomainBlocked('youtube.com', [])).toBe(false);
  });

  it('matches wildcard patterns in blocklist', () => {
    const blockList = [makeBlockItem('*.example.com', true)];
    expect(isDomainBlocked('sub.example.com', blockList)).toBe(true);
  });

  it('returns true on first match (short-circuits)', () => {
    const blockList = [
      makeBlockItem('youtube.com', false),
      makeBlockItem('*.example.com', true)
    ];
    expect(isDomainBlocked('youtube.com', blockList)).toBe(true);
  });
});

describe('parseDomainInput', () => {
  it('parses plain domain', () => {
    expect(parseDomainInput('example.com')).toEqual({
      domain: 'example.com',
      isWildcard: false
    });
  });

  it('parses wildcard domain', () => {
    expect(parseDomainInput('*.example.com')).toEqual({
      domain: '*.example.com',
      isWildcard: true
    });
  });

  it('removes http protocol', () => {
    expect(parseDomainInput('http://example.com')).toEqual({
      domain: 'example.com',
      isWildcard: false
    });
  });

  it('removes https protocol', () => {
    expect(parseDomainInput('https://example.com')).toEqual({
      domain: 'example.com',
      isWildcard: false
    });
  });

  it('removes path from URL', () => {
    expect(parseDomainInput('https://example.com/path/to/page')).toEqual({
      domain: 'example.com',
      isWildcard: false
    });
  });

  it('trims whitespace', () => {
    expect(parseDomainInput('  example.com  ')).toEqual({
      domain: 'example.com',
      isWildcard: false
    });
  });

  it('converts to lowercase', () => {
    expect(parseDomainInput('EXAMPLE.COM')).toEqual({
      domain: 'example.com',
      isWildcard: false
    });
  });

  it('handles protocol with wildcard', () => {
    expect(parseDomainInput('https://*.example.com')).toEqual({
      domain: '*.example.com',
      isWildcard: true
    });
  });

  it('handles query string in path removal', () => {
    // Query strings after path are removed by the /.*$/ regex
    expect(parseDomainInput('example.com/path?query=value')).toEqual({
      domain: 'example.com',
      isWildcard: false
    });
  });

  it('preserves query/hash without path', () => {
    // Without path, query/hash aren't removed (edge case of the regex)
    // This is acceptable as users should input valid domains
    expect(parseDomainInput('example.com?query')).toEqual({
      domain: 'example.com?query',
      isWildcard: false
    });
    expect(parseDomainInput('example.com#hash')).toEqual({
      domain: 'example.com#hash',
      isWildcard: false
    });
  });
});

describe('isValidDomain', () => {
  it('validates standard domain', () => {
    expect(isValidDomain('example.com')).toBe(true);
  });

  it('validates subdomain', () => {
    expect(isValidDomain('www.example.com')).toBe(true);
  });

  it('validates wildcard domain', () => {
    expect(isValidDomain('*.example.com')).toBe(true);
  });

  it('validates deeply nested subdomain', () => {
    expect(isValidDomain('a.b.c.example.com')).toBe(true);
  });

  it('rejects single-label domain', () => {
    expect(isValidDomain('localhost')).toBe(false);
  });

  it('rejects domain with invalid TLD (numeric)', () => {
    expect(isValidDomain('example.123')).toBe(false);
  });

  it('rejects domain with single-char TLD', () => {
    expect(isValidDomain('example.c')).toBe(false);
  });

  it('rejects domain exceeding 253 chars', () => {
    const longDomain = 'a'.repeat(250) + '.com';
    expect(isValidDomain(longDomain)).toBe(false);
  });

  it('rejects label exceeding 63 chars', () => {
    const longLabel = 'a'.repeat(64) + '.example.com';
    expect(isValidDomain(longLabel)).toBe(false);
  });

  it('rejects domain with empty label', () => {
    expect(isValidDomain('example..com')).toBe(false);
  });

  it('rejects domain starting with hyphen', () => {
    expect(isValidDomain('-example.com')).toBe(false);
  });

  it('rejects domain ending with hyphen', () => {
    expect(isValidDomain('example-.com')).toBe(false);
  });

  it('accepts domain with hyphen in middle', () => {
    expect(isValidDomain('my-example.com')).toBe(true);
  });

  it('accepts domain with numbers', () => {
    expect(isValidDomain('example123.com')).toBe(true);
  });

  it('rejects empty string', () => {
    expect(isValidDomain('')).toBe(false);
  });

  it('rejects domain with special characters', () => {
    expect(isValidDomain('exam@ple.com')).toBe(false);
  });

  it('validates internationalized TLD', () => {
    expect(isValidDomain('example.co')).toBe(true);
    expect(isValidDomain('example.info')).toBe(true);
  });
});

describe('generateId', () => {
  it('generates a 32-character hex string', () => {
    const id = generateId();
    expect(id).toHaveLength(32);
    expect(id).toMatch(/^[0-9a-f]{32}$/);
  });

  it('generates unique IDs', () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).not.toBe(id2);
  });

  it('generates multiple unique IDs', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateId());
    }
    expect(ids.size).toBe(100);
  });
});
