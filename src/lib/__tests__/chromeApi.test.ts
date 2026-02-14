import { describe, expect, it, vi, beforeEach } from 'vitest';

import {
  isExtensionContextValid,
  getActiveTab,
  openOptionsPage,
  createTab,
  getExtensionURL,
  openExtensionPage
} from '~/lib/chromeApi';

beforeEach(() => {
  vi.clearAllMocks();
  // chrome APIのグローバルモック
  (globalThis as Record<string, unknown>).chrome = {
    runtime: {
      id: 'test-extension-id',
      openOptionsPage: vi.fn(),
      getURL: vi.fn((path: string) => `chrome-extension://test-id/${path}`)
    },
    tabs: {
      query: vi.fn(),
      create: vi.fn()
    }
  };
});

describe('isExtensionContextValid', () => {
  it('chrome.runtime.idが存在する場合はtrue', () => {
    expect(isExtensionContextValid()).toBe(true);
  });

  it('chrome.runtime.idがundefinedの場合はfalse', () => {
    (globalThis as Record<string, unknown>).chrome = {
      runtime: { id: undefined }
    };
    expect(isExtensionContextValid()).toBe(false);
  });

  it('例外が発生した場合はfalse', () => {
    (globalThis as Record<string, unknown>).chrome = {
      get runtime() {
        throw new Error('Extension context invalidated');
      }
    };
    expect(isExtensionContextValid()).toBe(false);
  });
});

describe('getActiveTab', () => {
  it('アクティブタブを返す', async () => {
    const mockTab = { id: 1, url: 'https://youtube.com' };
    vi.mocked(chrome.tabs.query).mockResolvedValue([mockTab] as chrome.tabs.Tab[]);
    const tab = await getActiveTab();
    expect(tab).toEqual(mockTab);
    expect(chrome.tabs.query).toHaveBeenCalledWith({
      active: true,
      currentWindow: true
    });
  });

  it('タブがない場合はundefined', async () => {
    vi.mocked(chrome.tabs.query).mockResolvedValue([]);
    const tab = await getActiveTab();
    expect(tab).toBeUndefined();
  });
});

describe('openOptionsPage', () => {
  it('chrome.runtime.openOptionsPageを呼ぶ', () => {
    openOptionsPage();
    expect(chrome.runtime.openOptionsPage).toHaveBeenCalled();
  });

  it('コンテキストが無効な場合は何もしない', () => {
    (globalThis as Record<string, unknown>).chrome = {
      runtime: { id: undefined, openOptionsPage: vi.fn() }
    };
    openOptionsPage();
    // openOptionsPageは呼ばれない
  });
});

describe('createTab', () => {
  it('指定URLで新しいタブを作成する', () => {
    createTab('https://example.com');
    expect(chrome.tabs.create).toHaveBeenCalledWith({
      url: 'https://example.com'
    });
  });
});

describe('getExtensionURL', () => {
  it('拡張のリソースURLを返す', () => {
    const url = getExtensionURL('options.html');
    expect(url).toContain('options.html');
  });

  it('コンテキストが無効な場合は空文字を返す', () => {
    (globalThis as Record<string, unknown>).chrome = {
      runtime: { id: undefined, getURL: vi.fn() }
    };
    const url = getExtensionURL('options.html');
    expect(url).toBe('');
  });
});

describe('openExtensionPage', () => {
  it('拡張ページのURLで新しいタブを開く', () => {
    openExtensionPage('options.html');
    expect(chrome.tabs.create).toHaveBeenCalled();
  });
});
