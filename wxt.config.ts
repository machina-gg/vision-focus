import { defineConfig } from 'wxt';

/**
 * WXT のビルド設定。
 *
 * manifest の内容は「WXT が生成できないものだけ」をここに書く。
 * icons / action.default_popup / background / options_ui / chrome_url_overrides /
 * content_scripts / name(※) / version / description は WXT がエントリと
 * package.json から生成するため、ここには書かない。
 *
 * ※ name だけは例外。WXT の既定は package.json の `name`（= vision-focus）だが、
 *    ストア表示名は VisionFocus なので明示する。
 */
export default defineConfig({
  // エントリの探索起点。`~` / `@` エイリアスも srcDir を指すため、
  // 既存コードの `~/lib/...` 形式の import はそのまま使える
  srcDir: 'src',
  // 出力へそのままコピーされる静的ファイル（root 相対）
  publicDir: 'public',
  // auto-import は使わない（既存コードは全 import を明示している）。
  // defineBackground / defineContentScript は `#imports` から明示的に import する
  imports: false,
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'VisionFocus',
    default_locale: 'en',
    host_permissions: ['<all_urls>'],
    permissions: [
      'storage',
      'tabs',
      'declarativeNetRequest',
      'alarms',
      'webNavigation',
      'notifications',
      'clipboardWrite'
    ],
    content_security_policy: {
      extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'"
    },
    web_accessible_resources: [
      {
        resources: ['assets/images/backgrounds/*'],
        matches: ['<all_urls>']
      }
    ],
    // WXT が action に入れるのは default_popup だけなので、
    // ツールバーアイコン（public/icon/*.png）は自分で指定する
    action: {
      default_icon: {
        16: 'icon/16.png',
        32: 'icon/32.png',
        48: 'icon/48.png',
        64: 'icon/64.png',
        128: 'icon/128.png'
      }
    }
  }
});
