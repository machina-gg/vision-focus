// 保存領域には旧実装が JSON 文字列で書いた値が残りうる。fallback は null / undefined にしか効かないので、読み出し側でここを通して既定値に倒す
// storage.ts は import した時点で保存領域を読むので、ここから import しない（React フックから参照されるため）

/**
 * 保存値が使える形（オブジェクト）か
 * @param value 保存領域から読んだ値
 * @returns null でないオブジェクトなら true
 */
export function isStoredObject<T>(value: T): value is T & object {
  return typeof value === 'object' && value !== null;
}

/**
 * 保存値がオブジェクトでなければ既定値を返す
 * @param value 保存領域から読んだ値
 * @param fallback 使えない値のときに返す既定値
 * @returns value が使える形ならそのまま、使えなければ fallback
 */
export function objectOrFallback<T>(value: T, fallback: T): T {
  return isStoredObject(value) ? value : fallback;
}
