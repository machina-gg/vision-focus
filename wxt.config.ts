import { defineConfig } from 'wxt';

// manifest には WXT がエントリと package.json から生成できないものだけを書く
export default defineConfig({
  srcDir: 'src',
  publicDir: 'public',
  imports: false,
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: '__MSG_extensionName__',
    description: '__MSG_extensionDescription__',
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
        // redirect 先の newtab.html を公開しないと、他サイトからの遷移が ERR_BLOCKED_BY_CLIENT で止まる
        resources: ['newtab.html', 'assets/images/backgrounds/*'],
        matches: ['<all_urls>']
      }
    ],
    // WXT は action に default_popup しか入れないので、アイコンは自分で指定する
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
