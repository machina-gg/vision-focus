/**
 * 配列の index 番目を取り出す。無ければ例外を投げてテストを失敗させる
 * @param items 取り出し元（配列・NodeList・モックの呼び出し記録など）
 * @param index 取り出す位置
 * @returns index 番目の要素
 */
export function itemAt<T>(items: ArrayLike<T>, index: number): T {
  const item = items[index];
  if (item === undefined) {
    throw new Error(`${index} 番目の要素が無い（長さ ${items.length}）`);
  }
  return item;
}

/**
 * 配列の最後の要素を取り出す。空なら例外を投げてテストを失敗させる
 * @param items 取り出し元
 * @returns 最後の要素
 */
export function lastItem<T>(items: ArrayLike<T>): T {
  return itemAt(items, items.length - 1);
}

/**
 * Record から key の値を取り出す。無ければ例外を投げてテストを失敗させる
 * @param record 取り出し元
 * @param key 取り出すキー
 * @returns key の値
 */
export function entryOf<T>(record: Partial<Record<string, T>>, key: string): T {
  const entry = record[key];
  if (entry === undefined) {
    throw new Error(`キー ${key} の値が無い`);
  }
  return entry;
}
