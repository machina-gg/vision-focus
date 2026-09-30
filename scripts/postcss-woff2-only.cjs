/**
 * @font-face の src から woff2 以外の候補を落とす PostCSS プラグイン。
 * Vite は src に書かれた url() をすべて成果物へ出すため、Chrome が読まない woff が同梱されるのを防ぐ。
 * woff2 の候補が 1 つも無い src は書き換えない（フォントが読めなくなるのを避ける）。
 * @returns PostCSS のプラグイン
 */
function woff2Only() {
  return {
    postcssPlugin: 'woff2-only',
    // Vite の url 書き換え（アセットの出力）は Once で走るので、Declaration ではなく Once で先に書き換える
    Once(root) {
      root.walkAtRules('font-face', (rule) => {
        rule.walkDecls('src', (decl) => {
          const woff2 = splitTopLevelCommas(decl.value).filter((candidate) =>
            /format\(\s*['"]?woff2['"]?\s*\)/.test(candidate)
          );
          if (woff2.length === 0) return;
          decl.value = woff2.join(', ');
        });
      });
    }
  };
}
woff2Only.postcss = true;

/**
 * 括弧と引用符の外にあるカンマで区切る（url() の中のカンマで割らない）
 * @param value src の値
 * @returns 前後の空白を除いた候補の一覧
 */
function splitTopLevelCommas(value) {
  const parts = [];
  let depth = 0;
  let quote = null;
  let start = 0;
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === '(') {
      depth++;
    } else if (ch === ')') {
      depth--;
    } else if (ch === ',' && depth === 0) {
      parts.push(value.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(value.slice(start).trim());
  return parts.filter((part) => part.length > 0);
}

module.exports = woff2Only;
