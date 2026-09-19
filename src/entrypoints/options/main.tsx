import React from 'react';
import { createRoot } from 'react-dom/client';

import { OptionsApp } from './App';

// index.html の #root に React ツリーをマウントする。
// ⚠ StrictMode は付けない。開発ビルドで effect が 2 回走り、
// 初期化時に 1 回だけ実行する処理（ブロック情報の読み出しと消去など）が壊れる
const container = document.getElementById('root');

if (!container) {
  throw new Error('マウント先の #root が見つかりません');
}

createRoot(container).render(<OptionsApp />);
