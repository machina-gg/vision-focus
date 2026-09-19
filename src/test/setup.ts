import '@testing-library/jest-dom';

/**
 * chrome.storage の最小スタブ
 *
 * ストレージ項目の定義（src/lib/storage.ts）は、モジュールが読み込まれた時点で
 * 保存領域を読みに行く（@wxt-dev/storage の defineItem）。拡張機能ではない
 * vitest 環境には chrome が無いため、`~/lib/storage` を実体のまま import する
 * テストでは未処理の rejection になる。全テスト共通の入れ物をここで用意する。
 *
 * 各テストが独自の chrome モックを置く場合は、このスタブを上書きしてよい
 * （setupFiles はテストファイルの import より先に走る）。
 */
function createStorageArea() {
  const data: Record<string, unknown> = {};

  return {
    get: async (keys?: string | string[]) => {
      if (typeof keys === 'string') return { [keys]: data[keys] };
      if (Array.isArray(keys)) {
        return Object.fromEntries(keys.map((key) => [key, data[key]]));
      }
      return { ...data };
    },
    set: async (items: Record<string, unknown>) => {
      Object.assign(data, items);
    },
    remove: async (keys: string | string[]) => {
      for (const key of Array.isArray(keys) ? keys : [keys]) delete data[key];
    },
    clear: async () => {
      for (const key of Object.keys(data)) delete data[key];
    },
    onChanged: {
      addListener: () => undefined,
      removeListener: () => undefined
    }
  };
}

(globalThis as Record<string, unknown>).chrome = {
  runtime: { id: 'vitest' },
  storage: {
    local: createStorageArea(),
    session: createStorageArea(),
    sync: createStorageArea(),
    managed: createStorageArea()
  }
};
