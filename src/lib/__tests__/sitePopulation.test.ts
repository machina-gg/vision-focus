import { describe, expect, it } from 'vitest';

import { allowedSiteKeys, wasteSiteKeys } from '../sitePopulation';
import { allowedSite, blockedSite, sitesOf, trackedSite } from '~/test/sites';

const sites = sitesOf(
  blockedSite('youtube.com'),
  blockedSite('x.com', { enabled: false }),
  trackedSite('reddit.com'),
  allowedSite('music.youtube.com', true),
  allowedSite('studio.youtube.com', false)
);

describe('wasteSiteKeys', () => {
  it('ブロック（無効を含む）と規則なしのサイトを返し、許可サイトを除く', () => {
    expect(wasteSiteKeys(sites).sort()).toEqual([
      'reddit.com',
      'x.com',
      'youtube.com'
    ]);
  });

  it('登録が無ければ空', () => {
    expect(wasteSiteKeys({})).toEqual([]);
  });
});

describe('allowedSiteKeys', () => {
  it('記録の有無を問わず許可サイトだけを返す', () => {
    expect(allowedSiteKeys(sites).sort()).toEqual([
      'music.youtube.com',
      'studio.youtube.com'
    ]);
  });

  it('許可サイトが無ければ空', () => {
    expect(allowedSiteKeys(sitesOf(blockedSite('youtube.com')))).toEqual([]);
  });
});
