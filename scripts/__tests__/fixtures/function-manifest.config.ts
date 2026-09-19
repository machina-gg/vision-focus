/** CLI 起動テスト用の比較先設定（manifest が関数形式で、権限を静的に読めない） */
export default {
  manifest: () => ({
    permissions: ['storage'],
    host_permissions: ['https://example.com/*']
  })
};
