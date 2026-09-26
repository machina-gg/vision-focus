import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { sendMessage, onMessage, removeAllListeners } from '~/lib/messaging';

/**
 * ProtocolMap の型は tsc が検査するため、ここでは実行時の配線
 * （chrome.runtime の API に乗っているか）だけを確かめる
 */

interface RuntimeMessage {
  type: string;
  data: unknown;
  timestamp?: number;
}

type RootListener = (
  message: RuntimeMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: unknown) => void
) => boolean | undefined;

let listeners: RootListener[] = [];
let lastSentMessage: RuntimeMessage | undefined;
let respondWith: unknown;

beforeEach(() => {
  listeners = [];
  lastSentMessage = undefined;
  respondWith = { res: { success: true } };

  vi.stubGlobal('chrome', {
    runtime: {
      lastError: undefined,
      sendMessage: vi.fn(
        (message: RuntimeMessage, callback: (response: unknown) => void) => {
          lastSentMessage = message;
          callback(respondWith);
        }
      ),
      onMessage: {
        addListener: vi.fn((listener: RootListener) => {
          listeners.push(listener);
        }),
        removeListener: vi.fn((listener: RootListener) => {
          listeners = listeners.filter((item) => item !== listener);
        })
      }
    }
  });
});

afterEach(() => {
  removeAllListeners();
  vi.unstubAllGlobals();
});

describe('sendMessage', () => {
  it('name と data を chrome.runtime.sendMessage に載せる', async () => {
    const response = await sendMessage('add-block', { domain: 'youtube.com' });

    expect(lastSentMessage?.type).toBe('add-block');
    expect(lastSentMessage?.data).toEqual({ domain: 'youtube.com' });
    expect(response).toEqual({ success: true });
  });

  it('応答が無いときは例外を投げる', async () => {
    respondWith = undefined;

    await expect(sendMessage('reset-activity')).rejects.toThrow();
  });
});

describe('onMessage', () => {
  it('登録した name のメッセージだけをハンドラへ渡す', async () => {
    const handler = vi.fn(() => ({ success: true, paused: true }));
    onMessage('toggle-pause', handler);

    const rootListener = listeners[0];
    const sender = {} as chrome.runtime.MessageSender;

    const other = rootListener(
      { type: 'reset-activity', data: undefined, timestamp: Date.now() },
      sender,
      vi.fn()
    );
    expect(other).toBe(false);
    expect(handler).not.toHaveBeenCalled();

    const sendResponse = vi.fn();
    const handled = rootListener(
      { type: 'toggle-pause', data: { paused: true }, timestamp: Date.now() },
      sender,
      sendResponse
    );

    // 非同期応答のため true を返し、解決後に sendResponse が呼ばれる
    expect(handled).toBe(true);
    await vi.waitFor(() => {
      expect(sendResponse).toHaveBeenCalledWith({
        res: { success: true, paused: true }
      });
    });
  });
});
