import { describe, expect, it } from 'vitest';

import { messageErrorText } from '~/lib/messageError';
import { stubI18nWithLocale } from '~/test/i18n';
import type { MessageError } from '~/types/messages';

const ALL_ERRORS: MessageError[] = [
  { code: 'invalid-request' },
  { code: 'invalid-url' },
  { code: 'invalid-domain' },
  { code: 'already-blocked' },
  { code: 'already-tracked' },
  {
    code: 'nested-site',
    domain: 'm.youtube.com',
    nested: { site: 'youtube.com', relation: 'ancestor' }
  },
  { code: 'block-not-found' },
  { code: 'site-in-use' },
  { code: 'save-failed' }
];

describe('messageErrorText（ja）', () => {
  stubI18nWithLocale('ja');

  it.each([
    [{ code: 'invalid-domain' }, 'ドメインの形式が正しくありません'],
    [{ code: 'already-blocked' }, 'このサイトは既にブロックリストにあります'],
    [{ code: 'already-tracked' }, 'このサイトは既に追跡中です'],
    [{ code: 'block-not-found' }, 'このサイトのブロック設定が見つかりません'],
    [
      { code: 'site-in-use' },
      'ブロック設定か YouTube の機能が残っているため、追跡を止められません'
    ],
    [{ code: 'save-failed' }, '保存できませんでした。もう一度お試しください']
  ] satisfies [MessageError, string][])('%o は「%s」', (error, text) => {
    expect(messageErrorText(error)).toBe(text);
  });

  it('入れ子は、追跡中のサイトの内側なら「含まれる」、外側なら「含まれている」で相手を示す', () => {
    expect(
      messageErrorText({
        code: 'nested-site',
        domain: 'm.youtube.com',
        nested: { site: 'youtube.com', relation: 'ancestor' }
      })
    ).toBe('m.youtube.com は追跡中の youtube.com に含まれるため追加できません');
    expect(
      messageErrorText({
        code: 'nested-site',
        domain: 'google.com',
        nested: { site: 'mail.google.com', relation: 'descendant' }
      })
    ).toBe(
      'google.com には追跡中の mail.google.com が含まれるため追加できません'
    );
  });

  it.each([
    [{ code: 'invalid-request' }],
    [{ code: 'invalid-url' }],
    [undefined]
  ] satisfies [MessageError | undefined][])(
    '利用者に理由を見せない失敗（%o）は汎用の文言にする',
    (error) => {
      expect(messageErrorText(error)).toBe(
        '操作できませんでした。もう一度お試しください'
      );
    }
  );
});

describe('messageErrorText（en）', () => {
  stubI18nWithLocale('en');

  it.each(ALL_ERRORS.map((error) => [error]))(
    '%o の文言が英語の辞書にある',
    (error) => {
      expect(messageErrorText(error)).not.toBe('');
    }
  );

  it('英語でも拒否の理由を示す', () => {
    expect(messageErrorText({ code: 'already-tracked' })).toBe(
      'This site is already tracked'
    );
  });
});
