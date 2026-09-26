import { defineBackground } from '#imports';

import { initBackground } from '~/background/init';

/** background の Service Worker（起動時にリスナーとメッセージハンドラを登録する） */
export default defineBackground(() => {
  initBackground();
});
