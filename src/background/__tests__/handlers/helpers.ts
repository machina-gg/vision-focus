/**
 * メッセージハンドラのテスト用ヘルパー。
 *
 * @webext-core/messaging のハンドラは onMessage のコールバック
 * （`{ id, type, data, timestamp, sender }` を受け取り、応答を返り値で返す形）
 * なので、data 以外のフィールドを埋めたメッセージを組み立てて呼び出す
 */

/**
 * ハンドラを呼び出し、返り値（応答）を返す。
 *
 * 型は緩めている（ハンドラごとに data の型が異なり、テストでは意図的に
 * 不正な値も渡すため）。
 */
export async function invoke<TResponse = unknown>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- ハンドラごとに data の型が異なるため
  handler: (message: any) => unknown,
  data: unknown
): Promise<TResponse | undefined> {
  const response = await handler({
    id: 1,
    type: 'test',
    data,
    timestamp: Date.now(),
    sender: {} as chrome.runtime.MessageSender
  });
  return response as TResponse | undefined;
}
