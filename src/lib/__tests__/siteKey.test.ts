import { describe, expect, it } from 'vitest';

import {
  coveringSiteKeys,
  findNestingConflict,
  normalizeSiteKey,
  resolveSiteKey
} from '~/lib/siteKey';
import { allowedSite, blockedSite, sitesOf, trackedSite } from '~/test/sites';
import type { SiteEntry, SiteRule } from '~/types/site';

describe('normalizeSiteKey', () => {
  it('小文字にする', () => {
    expect(normalizeSiteKey('YouTube.COM')).toBe('youtube.com');
  });

  it('先頭の *. を除く', () => {
    expect(normalizeSiteKey('*.example.com')).toBe('example.com');
  });

  it('先頭の www. を除く', () => {
    expect(normalizeSiteKey('www.example.com')).toBe('example.com');
  });

  it('*.www. の両方を除く', () => {
    expect(normalizeSiteKey('*.www.example.com')).toBe('example.com');
  });

  it('前後の空白を除く', () => {
    expect(normalizeSiteKey('  Example.com ')).toBe('example.com');
  });

  it('www 以外のサブドメインは残す', () => {
    expect(normalizeSiteKey('mail.google.com')).toBe('mail.google.com');
    expect(normalizeSiteKey('m.youtube.com')).toBe('m.youtube.com');
  });

  it('先頭以外の www. は残す', () => {
    expect(normalizeSiteKey('a.www.example.com')).toBe('a.www.example.com');
  });

  it('既に正規化済みなら変えない（同じ入力を 2 回通しても同じ）', () => {
    const once = normalizeSiteKey('*.WWW.Example.com');
    expect(normalizeSiteKey(once)).toBe(once);
  });
});

describe('resolveSiteKey', () => {
  const sites = ['youtube.com', 'reddit.com', 'x.com'];

  it('キーと一致するホスト名はそのキー', () => {
    expect(resolveSiteKey('youtube.com', sites)).toBe('youtube.com');
  });

  it('www 付きのホスト名もそのキー', () => {
    expect(resolveSiteKey('www.youtube.com', sites)).toBe('youtube.com');
  });

  it('任意の深さのサブドメインもそのキー', () => {
    expect(resolveSiteKey('m.youtube.com', sites)).toBe('youtube.com');
    expect(resolveSiteKey('a.b.reddit.com', sites)).toBe('reddit.com');
  });

  it('キーで終わるだけの別ドメインは一致しない', () => {
    expect(resolveSiteKey('badyoutube.com', sites)).toBeNull();
    expect(resolveSiteKey('notx.com', sites)).toBeNull();
  });

  it('どれにも属さなければ null', () => {
    expect(resolveSiteKey('example.com', sites)).toBeNull();
  });

  it('ホスト名の大文字は区別しない', () => {
    expect(resolveSiteKey('WWW.YouTube.com', sites)).toBe('youtube.com');
  });

  it('空のホスト名は null', () => {
    expect(resolveSiteKey('', sites)).toBeNull();
  });

  it('空のキーはどのホストにも一致しない', () => {
    expect(resolveSiteKey('example.com', [''])).toBeNull();
  });

  it('複数一致したら最も長いキーを返す（登録順に左右されない）', () => {
    expect(
      resolveSiteKey('mail.google.com', ['google.com', 'mail.google.com'])
    ).toBe('mail.google.com');
    expect(
      resolveSiteKey('mail.google.com', ['mail.google.com', 'google.com'])
    ).toBe('mail.google.com');
  });
});

describe('coveringSiteKeys', () => {
  it('覆うキーをキーの長い順に返す（登録順に左右されない）', () => {
    expect(
      coveringSiteKeys('a.music.youtube.com', [
        'youtube.com',
        'a.music.youtube.com',
        'music.youtube.com',
        'x.com'
      ])
    ).toEqual(['a.music.youtube.com', 'music.youtube.com', 'youtube.com']);
  });

  it('接尾辞が同じだけの別ドメインと空のキーは含めない', () => {
    expect(
      coveringSiteKeys('badyoutube.com', ['youtube.com', '', 'x.com'])
    ).toEqual([]);
  });

  it('空のホスト名は空', () => {
    expect(coveringSiteKeys('  ', ['youtube.com'])).toEqual([]);
  });
});

describe('findNestingConflict', () => {
  type Kind = SiteRule['kind'] | null;

  function existing(kind: Kind, domain: string): SiteEntry {
    if (kind === 'block') return blockedSite(domain);
    if (kind === 'allow') return allowedSite(domain);
    return trackedSite(domain);
  }

  describe('既存が祖先（youtube.com）で、子（music.youtube.com）を足す', () => {
    it.each([
      ['block', 'block', true],
      ['block', null, true],
      ['block', 'allow', false],
      [null, 'block', true],
      [null, null, true],
      [null, 'allow', false],
      ['allow', 'block', true],
      ['allow', null, true],
      ['allow', 'allow', false]
    ] satisfies [Kind, Kind, boolean][])(
      '祖先 %s ⊃ 追加 %s: 拒むか %s',
      (ancestorKind, kind, rejected) => {
        const sites = sitesOf(existing(ancestorKind, 'youtube.com'));
        expect(findNestingConflict('music.youtube.com', kind, sites)).toEqual(
          rejected ? { site: 'youtube.com', relation: 'ancestor' } : null
        );
      }
    );
  });

  describe('既存が子孫（music.youtube.com）で、親（youtube.com）を足す', () => {
    it.each([
      ['block', 'block', true],
      ['block', null, true],
      ['block', 'allow', true],
      [null, 'block', true],
      [null, null, true],
      [null, 'allow', true],
      ['allow', 'block', false],
      ['allow', null, false],
      ['allow', 'allow', false]
    ] satisfies [Kind, Kind, boolean][])(
      '子孫 %s ⊂ 追加 %s: 拒むか %s',
      (descendantKind, kind, rejected) => {
        const sites = sitesOf(existing(descendantKind, 'music.youtube.com'));
        expect(findNestingConflict('youtube.com', kind, sites)).toEqual(
          rejected
            ? { site: 'music.youtube.com', relation: 'descendant' }
            : null
        );
      }
    );
  });

  it('深い子孫も数える', () => {
    const sites = sitesOf(trackedSite('a.b.youtube.com'));
    expect(findNestingConflict('youtube.com', 'block', sites)).toEqual({
      site: 'a.b.youtube.com',
      relation: 'descendant'
    });
  });

  it.each([
    ['同じキーは入れ子に数えない', 'youtube.com'],
    ['接尾辞が同じだけの別ドメイン', 'notyoutube.com'],
    ['兄弟のサブドメイン', 'drive.google.com'],
    ['関係の無いドメイン', 'x.com']
  ])('%s', (_label, key) => {
    const sites = sitesOf(
      blockedSite('youtube.com'),
      trackedSite('mail.google.com')
    );
    expect(findNestingConflict(key, 'block', sites)).toBeNull();
  });

  it('空のキーは読み飛ばす', () => {
    expect(
      findNestingConflict('x.com', 'block', { '': trackedSite('') })
    ).toBeNull();
  });
});
