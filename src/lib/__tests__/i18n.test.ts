import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { getMessage, getUILanguage } from '~/lib/i18n';

const mockChromeI18n = {
  getUILanguage: vi.fn(),
  getMessage: vi.fn()
};

describe('i18n utilities', () => {
  beforeEach(() => {
    global.chrome = { i18n: mockChromeI18n } as unknown as typeof chrome;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getUILanguage', () => {
    it('ブラウザの UI 言語が日本語なら ja を返す', () => {
      mockChromeI18n.getUILanguage.mockReturnValue('ja');
      expect(getUILanguage()).toBe('ja');
    });

    it('地域付きの ja-JP でも ja を返す', () => {
      mockChromeI18n.getUILanguage.mockReturnValue('ja-JP');
      expect(getUILanguage()).toBe('ja');
    });

    it('英語なら en を返す', () => {
      mockChromeI18n.getUILanguage.mockReturnValue('en-US');
      expect(getUILanguage()).toBe('en');
    });

    it('対応していない言語は en に倒す', () => {
      mockChromeI18n.getUILanguage.mockReturnValue('fr');
      expect(getUILanguage()).toBe('en');
    });

    it('chrome.i18n が例外を投げる場合も en を返す', () => {
      mockChromeI18n.getUILanguage.mockImplementation(() => {
        throw new Error('Not available');
      });
      expect(getUILanguage()).toBe('en');
    });

    it('戻り値が undefined の場合も en を返す', () => {
      mockChromeI18n.getUILanguage.mockReturnValue(undefined);
      expect(getUILanguage()).toBe('en');
    });

    it('chrome が無い環境でも en を返す', () => {
      global.chrome = undefined as unknown as typeof chrome;
      expect(getUILanguage()).toBe('en');
    });
  });

  describe('getMessage', () => {
    it('chrome.i18n.getMessage の戻り値をそのまま返す', () => {
      mockChromeI18n.getMessage.mockReturnValue('Site Blocked');
      expect(getMessage('siteBlocked')).toBe('Site Blocked');
      expect(mockChromeI18n.getMessage).toHaveBeenCalledWith(
        'siteBlocked',
        undefined
      );
    });

    it('置換する値をそのまま chrome.i18n へ渡す', () => {
      mockChromeI18n.getMessage.mockReturnValue('example.com is on your list');
      expect(getMessage('siteBlockedMessage', 'example.com')).toBe(
        'example.com is on your list'
      );
      expect(mockChromeI18n.getMessage).toHaveBeenCalledWith(
        'siteBlockedMessage',
        'example.com'
      );
    });

    it('置換する値が配列でもそのまま渡す', () => {
      mockChromeI18n.getMessage.mockReturnValue('a has 1 min left of 2 min');
      const substitutions = ['a', '1', '2', ''];
      expect(getMessage('notificationTimeLimitMessage', substitutions)).toBe(
        'a has 1 min left of 2 min'
      );
      expect(mockChromeI18n.getMessage).toHaveBeenCalledWith(
        'notificationTimeLimitMessage',
        substitutions
      );
    });

    it('辞書に無いキーはキー名をそのまま返す', () => {
      // chrome.i18n は未定義のキーに空文字を返す
      mockChromeI18n.getMessage.mockReturnValue('');
      expect(getMessage('nonExistentKey')).toBe('nonExistentKey');
    });

    it('chrome.i18n が例外を投げる場合もキー名を返す', () => {
      mockChromeI18n.getMessage.mockImplementation(() => {
        throw new Error('Not available');
      });
      expect(getMessage('siteBlocked')).toBe('siteBlocked');
    });

    it('chrome が無い環境でもキー名を返す', () => {
      global.chrome = undefined as unknown as typeof chrome;
      expect(getMessage('siteBlocked')).toBe('siteBlocked');
    });
  });
});
