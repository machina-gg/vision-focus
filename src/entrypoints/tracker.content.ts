import { defineContentScript } from '#imports';

import { sendMessage } from '~/lib/messaging';

let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
let isStopped = false;

const HEARTBEAT_INTERVAL_MS = 5 * 1000;

function isContextValid(): boolean {
  try {
    return !!chrome.runtime?.id;
  } catch {
    return false;
  }
}

async function sendHeartbeat(status: 'active' | 'inactive' | 'heartbeat') {
  if (isStopped) return;

  if (!isContextValid()) {
    stopHeartbeat();
    return;
  }

  try {
    await sendMessage('tracker-heartbeat', {
      url: window.location.href,
      status,
      timestamp: Date.now()
    });
  } catch {
    stopHeartbeat();
  }
}

function handleVisibilityChange() {
  if (isStopped || !isContextValid()) {
    stopHeartbeat();
    return;
  }

  if (document.hidden) {
    sendHeartbeat('inactive');
  } else {
    sendHeartbeat('active');
  }
}

function startHeartbeat() {
  document.addEventListener('visibilitychange', handleVisibilityChange);

  heartbeatInterval = setInterval(() => {
    if (!isContextValid()) {
      stopHeartbeat();
      return;
    }

    if (!document.hidden) {
      sendHeartbeat('heartbeat');
    }
  }, HEARTBEAT_INTERVAL_MS);

  if (!document.hidden) {
    sendHeartbeat('active');
  }
}

function stopHeartbeat() {
  if (isStopped) return;
  isStopped = true;

  document.removeEventListener('visibilitychange', handleVisibilityChange);

  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

function handleUnload() {
  stopHeartbeat();
}

function init() {
  if (
    window.location.protocol === 'chrome-extension:' ||
    window.location.protocol === 'moz-extension:' ||
    window.location.protocol === 'about:'
  ) {
    return;
  }

  startHeartbeat();

  window.addEventListener('pagehide', handleUnload);
}

/** すべてのページで表示状態をハートビートとして background へ送り、滞在時間の記録に使わせるコンテンツスクリプト（拡張のページと about: では動かない） */
export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  main() {
    init();
  }
});
