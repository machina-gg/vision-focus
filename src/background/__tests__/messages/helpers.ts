import { vi } from 'vitest';

/**
 * メッセージハンドラのテスト用ヘルパー。
 *
 * Plasmo のメッセージハンドラは (req, res) を受け取り res.send() で応答するため、
 * 送信された値を検証できるモックを組み立てる。
 */

export interface MockRes<T = unknown> {
  send: ReturnType<typeof vi.fn>;
  /** res.send() に渡された値を取得する（未送信なら undefined） */
  sent: () => T | undefined;
}

/** res のモックを生成する */
export function createRes<T = unknown>(): MockRes<T> {
  const send = vi.fn();
  return {
    send,
    sent: () => send.mock.calls[0]?.[0] as T | undefined
  };
}

/** req のモックを生成する */
export function createReq<T>(body: T) {
  return { body } as { body: T };
}

/**
 * ハンドラを呼び出し、res.send() に渡された値を返す。
 *
 * 型は緩めている（Plasmo の MessageHandler は body の型がハンドラごとに
 * 異なり、テストでは意図的に不正な値も渡すため）。
 */
export async function invoke<TResponse = unknown>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- ハンドラごとに req/res の型が異なるため
  handler: (req: any, res: any) => unknown,
  body: unknown
): Promise<TResponse | undefined> {
  const res = createRes<TResponse>();
  await handler(createReq(body), res);
  return res.sent();
}
