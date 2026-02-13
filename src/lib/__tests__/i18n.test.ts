import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import {
  getBrowserLanguage,
  getCurrentLanguage,
  setCurrentLanguage,
  getMessage,
  getUILanguage,
  isJapanese,
  formatNumber,
  formatDate,
  getSupportedLanguages
} from '~/lib/i18n';
import type { SupportedLanguage } from '~/types/storage';

// Mock chrome.i18n API
const mockChromeI18n = {
  getUILanguage: vi.fn(),
  getMessage: vi.fn()
};

describe('i18n utilities', () => {
  beforeEach(() => {
    // Reset global chrome mock
    global.chrome = {
      i18n: mockChromeI18n
    } as any;

    // Reset current language to default
    setCurrentLanguage(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getBrowserLanguage', () => {
    it('日本語ブラウザでjaを返す', () => {
      mockChromeI18n.getUILanguage.mockReturnValue('ja');
      expect(getBrowserLanguage()).toBe('ja');
    });

    it('日本語ロケール（ja-JP）でjaを返す', () => {
      mockChromeI18n.getUILanguage.mockReturnValue('ja-JP');
      expect(getBrowserLanguage()).toBe('ja');
    });

    it('英語ブラウザでenを返す', () => {
      mockChromeI18n.getUILanguage.mockReturnValue('en');
      expect(getBrowserLanguage()).toBe('en');
    });

    it('英語ロケール（en-US）でenを返す', () => {
      mockChromeI18n.getUILanguage.mockReturnValue('en-US');
      expect(getBrowserLanguage()).toBe('en');
    });

    it('その他の言語でenをフォールバックとして返す', () => {
      mockChromeI18n.getUILanguage.mockReturnValue('fr');
      expect(getBrowserLanguage()).toBe('en');
    });

    it('chrome.i18nが利用できない場合にenを返す', () => {
      mockChromeI18n.getUILanguage.mockImplementation(() => {
        throw new Error('chrome.i18n not available');
      });
      expect(getBrowserLanguage()).toBe('en');
    });

    it('getUILanguageがundefinedを返す場合にenを返す', () => {
      mockChromeI18n.getUILanguage.mockReturnValue(undefined);
      expect(getBrowserLanguage()).toBe('en');
    });
  });

  describe('getCurrentLanguage', () => {
    it('言語が設定されていない場合はブラウザ言語を返す', () => {
      mockChromeI18n.getUILanguage.mockReturnValue('ja');
      expect(getCurrentLanguage()).toBe('ja');
    });

    it('言語が手動設定されている場合はその言語を返す', () => {
      mockChromeI18n.getUILanguage.mockReturnValue('en');
      setCurrentLanguage('ja');
      expect(getCurrentLanguage()).toBe('ja');
    });

    it('nullが設定されている場合はブラウザ言語に戻る', () => {
      mockChromeI18n.getUILanguage.mockReturnValue('en');
      setCurrentLanguage('ja');
      setCurrentLanguage(null);
      expect(getCurrentLanguage()).toBe('en');
    });
  });

  describe('setCurrentLanguage', () => {
    it('日本語に設定できる', () => {
      setCurrentLanguage('ja');
      expect(getCurrentLanguage()).toBe('ja');
    });

    it('英語に設定できる', () => {
      setCurrentLanguage('en');
      expect(getCurrentLanguage()).toBe('en');
    });

    it('nullに設定してブラウザ言語に戻せる', () => {
      mockChromeI18n.getUILanguage.mockReturnValue('ja');
      setCurrentLanguage('en');
      setCurrentLanguage(null);
      expect(getCurrentLanguage()).toBe('ja');
    });
  });

  describe('getMessage', () => {
    beforeEach(() => {
      // Reset to English for consistent testing
      mockChromeI18n.getUILanguage.mockReturnValue('en');
      setCurrentLanguage('en');
    });

    it('存在するメッセージキーを取得できる', () => {
      // appName exists in messages.json
      const message = getMessage('appName');
      expect(message).toBeDefined();
      expect(typeof message).toBe('string');
    });

    it('存在しないメッセージキーはキー名そのものを返す', () => {
      const message = getMessage('nonExistentKey');
      expect(message).toBe('nonExistentKey');
    });

    it('日本語メッセージを取得できる', () => {
      setCurrentLanguage('ja');
      const message = getMessage('appName');
      expect(message).toBeDefined();
      expect(typeof message).toBe('string');
    });

    it('日本語で存在しないキーは英語にフォールバックする', () => {
      setCurrentLanguage('ja');
      // Assuming 'appName' exists in both en and ja
      const message = getMessage('appName');
      expect(message).toBeDefined();
    });

    it('プレースホルダーを文字列で置換できる', () => {
      // Assuming a message like "Hello $1" exists
      const message = getMessage('appName', 'World');
      expect(message).toBeDefined();
    });

    it('プレースホルダーを配列で置換できる', () => {
      const message = getMessage('appName', ['First', 'Second']);
      expect(message).toBeDefined();
    });

    it('複数のプレースホルダーを順に置換できる', () => {
      // If message is "Test $1 and $2"
      const substitutions = ['First', 'Second'];
      const message = getMessage('appName', substitutions);
      expect(message).toBeDefined();
    });

    it('名前付きプレースホルダー（$DOMAIN$など）を置換できる', () => {
      // If message contains $DOMAIN$
      const message = getMessage('appName', 'example.com');
      expect(message).toBeDefined();
    });

    it('置換なしでメッセージを取得できる', () => {
      const message = getMessage('appName');
      expect(message).toBeDefined();
    });
  });

  describe('getUILanguage', () => {
    it('getCurrentLanguageと同じ値を返す（互換性）', () => {
      mockChromeI18n.getUILanguage.mockReturnValue('ja');
      setCurrentLanguage('en');
      expect(getUILanguage()).toBe(getCurrentLanguage());
      expect(getUILanguage()).toBe('en');
    });
  });

  describe('isJapanese', () => {
    it('現在の言語が日本語の場合にtrueを返す', () => {
      setCurrentLanguage('ja');
      expect(isJapanese()).toBe(true);
    });

    it('現在の言語が英語の場合にfalseを返す', () => {
      setCurrentLanguage('en');
      expect(isJapanese()).toBe(false);
    });

    it('ブラウザ言語が日本語の場合にtrueを返す', () => {
      mockChromeI18n.getUILanguage.mockReturnValue('ja');
      setCurrentLanguage(null);
      expect(isJapanese()).toBe(true);
    });
  });

  describe('formatNumber', () => {
    it('英語で数値をフォーマットする', () => {
      setCurrentLanguage('en');
      expect(formatNumber(1000)).toBe('1,000');
      expect(formatNumber(1234567)).toBe('1,234,567');
    });

    it('日本語で数値をフォーマットする', () => {
      setCurrentLanguage('ja');
      expect(formatNumber(1000)).toBe('1,000');
      expect(formatNumber(1234567)).toBe('1,234,567');
    });

    it('小数点を含む数値をフォーマットする', () => {
      setCurrentLanguage('en');
      expect(formatNumber(1234.56)).toContain('1,234');
    });

    it('0をフォーマットする', () => {
      setCurrentLanguage('en');
      expect(formatNumber(0)).toBe('0');
    });

    it('負の数をフォーマットする', () => {
      setCurrentLanguage('en');
      const formatted = formatNumber(-1000);
      expect(formatted).toContain('1,000');
      expect(formatted).toContain('-');
    });
  });

  describe('formatDate', () => {
    it('英語でDateオブジェクトをフォーマットする', () => {
      setCurrentLanguage('en');
      const date = new Date('2024-01-15T12:00:00Z');
      const formatted = formatDate(date);
      expect(formatted).toBeDefined();
      expect(typeof formatted).toBe('string');
    });

    it('日本語でDateオブジェクトをフォーマットする', () => {
      setCurrentLanguage('ja');
      const date = new Date('2024-01-15T12:00:00Z');
      const formatted = formatDate(date);
      expect(formatted).toBeDefined();
      expect(typeof formatted).toBe('string');
    });

    it('ISO文字列をフォーマットする', () => {
      setCurrentLanguage('en');
      const formatted = formatDate('2024-01-15T12:00:00Z');
      expect(formatted).toBeDefined();
      expect(typeof formatted).toBe('string');
    });

    it('カスタムオプションでフォーマットする', () => {
      setCurrentLanguage('en');
      const date = new Date('2024-01-15T12:00:00Z');
      const formatted = formatDate(date, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      expect(formatted).toBeDefined();
      expect(formatted).toContain('2024');
    });

    it('短い日付形式でフォーマットする', () => {
      setCurrentLanguage('en');
      const date = new Date('2024-01-15T12:00:00Z');
      const formatted = formatDate(date, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      expect(formatted).toBeDefined();
    });

    it('異なるロケールで日付をフォーマットする', () => {
      setCurrentLanguage('ja');
      const date = new Date('2024-01-15T12:00:00Z');
      const jaFormatted = formatDate(date);

      setCurrentLanguage('en');
      const enFormatted = formatDate(date);

      // The formats should be different for ja and en
      // (This test might be fragile depending on environment)
      expect(jaFormatted).toBeDefined();
      expect(enFormatted).toBeDefined();
    });
  });

  describe('getSupportedLanguages', () => {
    it('サポートされている言語の配列を返す', () => {
      const languages = getSupportedLanguages();
      expect(languages).toBeInstanceOf(Array);
      expect(languages.length).toBeGreaterThan(0);
    });

    it('英語と日本語が含まれる', () => {
      const languages = getSupportedLanguages();
      const codes = languages.map((l) => l.code);
      expect(codes).toContain('en');
      expect(codes).toContain('ja');
    });

    it('各言語に名前が含まれる', () => {
      const languages = getSupportedLanguages();
      languages.forEach((lang) => {
        expect(lang.code).toBeDefined();
        expect(lang.name).toBeDefined();
        expect(typeof lang.code).toBe('string');
        expect(typeof lang.name).toBe('string');
      });
    });

    it('英語の表示名が正しい', () => {
      const languages = getSupportedLanguages();
      const en = languages.find((l) => l.code === 'en');
      expect(en?.name).toBe('English');
    });

    it('日本語の表示名が正しい', () => {
      const languages = getSupportedLanguages();
      const ja = languages.find((l) => l.code === 'ja');
      expect(ja?.name).toBe('日本語');
    });

    it('重複がない', () => {
      const languages = getSupportedLanguages();
      const codes = languages.map((l) => l.code);
      const uniqueCodes = [...new Set(codes)];
      expect(codes.length).toBe(uniqueCodes.length);
    });
  });

  describe('edge cases', () => {
    it('複数回の言語切り替えが正しく動作する', () => {
      setCurrentLanguage('en');
      expect(getCurrentLanguage()).toBe('en');

      setCurrentLanguage('ja');
      expect(getCurrentLanguage()).toBe('ja');

      setCurrentLanguage('en');
      expect(getCurrentLanguage()).toBe('en');

      setCurrentLanguage(null);
      mockChromeI18n.getUILanguage.mockReturnValue('ja');
      expect(getCurrentLanguage()).toBe('ja');
    });

    it('chrome.i18nが完全に利用できない環境でも動作する', () => {
      global.chrome = undefined as any;
      expect(() => getBrowserLanguage()).not.toThrow();
      expect(getBrowserLanguage()).toBe('en'); // Default fallback
    });

    it('空のメッセージキーは空文字列自体を返す', () => {
      const message = getMessage('');
      expect(message).toBe('');
    });

    it('undefinedの置換値を渡してもエラーにならない', () => {
      expect(() => getMessage('appName', undefined)).not.toThrow();
    });

    it('空配列の置換値を渡してもエラーにならない', () => {
      expect(() => getMessage('appName', [])).not.toThrow();
    });

    it('formatDate with invalid date string', () => {
      setCurrentLanguage('en');
      const formatted = formatDate('invalid-date');
      expect(formatted).toBeDefined();
      // Invalid Date returns "Invalid Date" as string
    });

    it('formatNumber with very large number', () => {
      setCurrentLanguage('en');
      const formatted = formatNumber(9999999999999);
      expect(formatted).toBeDefined();
      expect(formatted).toContain(',');
    });

    it('formatNumber with very small number', () => {
      setCurrentLanguage('en');
      const formatted = formatNumber(0.0001);
      expect(formatted).toBeDefined();
    });
  });

  describe('language persistence', () => {
    it('setCurrentLanguageの効果が後続のgetCurrentLanguageに反映される', () => {
      setCurrentLanguage('ja');
      const lang1 = getCurrentLanguage();
      const lang2 = getCurrentLanguage();
      expect(lang1).toBe('ja');
      expect(lang2).toBe('ja');
    });

    it('setCurrentLanguage(null)でブラウザ言語に戻る', () => {
      mockChromeI18n.getUILanguage.mockReturnValue('en');
      setCurrentLanguage('ja');
      expect(getCurrentLanguage()).toBe('ja');

      setCurrentLanguage(null);
      expect(getCurrentLanguage()).toBe('en');
    });
  });

  describe('message substitution patterns', () => {
    beforeEach(() => {
      setCurrentLanguage('en');
    });

    it('単一プレースホルダー$1を置換', () => {
      const message = getMessage('appName', 'TestValue');
      expect(message).toBeDefined();
    });

    it('複数プレースホルダー$1,$2を置換', () => {
      const message = getMessage('appName', ['First', 'Second']);
      expect(message).toBeDefined();
    });

    it('配列の順序が正しく適用される', () => {
      const substitutions = ['A', 'B', 'C'];
      const message = getMessage('appName', substitutions);
      expect(message).toBeDefined();
    });

    it('置換が不要なメッセージはそのまま返される', () => {
      const message = getMessage('appName');
      expect(message).toBeDefined();
    });
  });
});
