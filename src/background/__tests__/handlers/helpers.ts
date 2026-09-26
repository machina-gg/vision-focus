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
