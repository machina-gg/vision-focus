/** CLI 起動テスト用の比較先設定（base に permissions を 1 つ足したもの） */
export default {
  manifest: {
    permissions: ['storage', 'tabs'],
    host_permissions: ['https://example.com/*']
  }
};
