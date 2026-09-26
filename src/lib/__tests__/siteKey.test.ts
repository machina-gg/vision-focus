import { describe, expect, it } from 'vitest';

import {
  normalizeSiteKey,
  resolveSiteKey,
  findNestedSite
} from '~/lib/siteKey';

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

describe('findNestedSite', () => {
  const SITES = ['youtube.com', 'mail.google.com'];

  it.each([
    [
      '既存のサブドメイン（既存が祖先）',
      'm.youtube.com',
      'youtube.com',
      'ancestor'
    ],
    ['深いサブドメイン', 'a.b.youtube.com', 'youtube.com', 'ancestor'],
    [
      '既存の親ドメイン（既存が子孫）',
      'google.com',
      'mail.google.com',
      'descendant'
    ]
  ] as const)('%s', (_label, key, site, relation) => {
    expect(findNestedSite(key, SITES)).toEqual({ site, relation });
  });

  it.each([
    ['同じキーは入れ子に数えない', 'youtube.com'],
    ['接尾辞が同じだけの別ドメイン', 'notyoutube.com'],
    ['兄弟のサブドメイン', 'drive.google.com'],
    ['関係の無いドメイン', 'x.com']
  ])('%s', (_label, key) => {
    expect(findNestedSite(key, SITES)).toBeNull();
  });

  it('空のキーは読み飛ばす', () => {
    expect(findNestedSite('x.com', [''])).toBeNull();
  });
});
