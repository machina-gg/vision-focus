/** CLI 起動テスト用の比較元設定（wxt.config.ts の default export を模した最小形） */
export default {
  manifest: {
    permissions: ['storage'],
    host_permissions: ['https://example.com/*']
  }
};
