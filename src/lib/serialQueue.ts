/** 投入された処理を投入順に 1 つずつ走らせる待ち行列 */
export type SerialQueue = <T>(task: () => Promise<T>) => Promise<T>;

/**
 * 処理を投入順に 1 つずつ走らせる待ち行列を作る（前の処理が失敗しても後の処理は走る）
 * @returns 処理を投入し、その処理の結果を返す関数（処理が失敗すればその呼び出しだけが reject する）
 */
export function createSerialQueue(): SerialQueue {
  let tail: Promise<void> = Promise.resolve();

  return async <T>(task: () => Promise<T>): Promise<T> => {
    const previous = tail;
    const run = (async () => {
      await previous;
      return await task();
    })();
    tail = (async () => {
      try {
        await run;
      } catch {
        // 後続の処理を止めないためだけに握る（失敗は run で呼び出し元へ返す）
      }
    })();
    return await run;
  };
}
