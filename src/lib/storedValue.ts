/**
 * 保存された値の形を検査する。
 *
 * 保存領域には、以前の実装が JSON 文字列として書いた値が残っていることがある
 * （キーは変わらないため、`local:settings` の実体は今も `settings`）。
 * 項目定義の `fallback` は値が null / undefined のときしか効かないので、
 * 読み出し側でこのガードを通して既定値に倒す。
 *
 * 旧データの移行（JSON.parse）は行わない。保存済みデータは捨てる方針のため
 * （machina-gg/vision-focus#403）。
 *
 * ストレージへ触らない純粋な関数だけを置く（`src/lib/storage.ts` は import
 * した時点で保存領域を読みに行くため、React フックからは参照しない）。
 */

/** 値が使える形（オブジェクト）か */
export function isStoredObject<T>(value: T): value is T & object {
  return typeof value === 'object' && value !== null;
}

/** 値が使える形でなければ既定値を返す */
export function objectOrFallback<T>(value: T, fallback: T): T {
  return isStoredObject(value) ? value : fallback;
}
