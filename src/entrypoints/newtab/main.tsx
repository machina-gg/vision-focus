import React from 'react';
import { createRoot } from 'react-dom/client';

import { NewtabApp } from './App';

// StrictMode は付けない（開発ビルドで effect が 2 回走り、ブロック情報の読み出しと消去など 1 回限りの初期化が壊れる）
const container = document.getElementById('root');

if (!container) {
  throw new Error('マウント先の #root が見つかりません');
}

createRoot(container).render(<NewtabApp />);
