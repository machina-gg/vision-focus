import '@testing-library/jest-dom';

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
