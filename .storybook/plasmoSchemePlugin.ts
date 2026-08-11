import fs from 'fs';
import path from 'path';
import type { Plugin } from 'vite';

/**
 * Plasmo の import スキームを Storybook（vite）で解決するプラグイン
 *
 * Plasmo は `data-base64:assets/icon.png` のような独自スキームで
 * アセットを取り込む。これは Plasmo のバンドラが処理するため、素の vite で
 * ビルドする Storybook では「解決できない import」として失敗する。
 *
 * 対応スキーム（https://docs.plasmo.com/framework/import）:
 *
 * | スキーム      | 返すもの                          |
 * | ------------- | --------------------------------- |
 * | `data-base64:` | base64 データ URI                 |
 * | `data-text:`   | ファイルの中身（文字列）          |
 * | `raw:`         | ファイルの中身（文字列）          |
 * | `url:`         | Storybook から参照できる URL      |
 *
 * パスはプロジェクトルート起点で解決する（Plasmo と同じ扱い）。
 */

const SCHEMES = ['data-base64:', 'data-text:', 'raw:', 'url:'] as const;

const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

function matchScheme(id: string): { scheme: string; filePath: string } | null {
  for (const scheme of SCHEMES) {
    if (id.startsWith(scheme)) {
      return { scheme, filePath: id.slice(scheme.length) };
    }
  }
  return null;
}

export function plasmoSchemePlugin(projectRoot: string): Plugin {
  const PREFIX = '\0plasmo-scheme:';

  return {
    name: 'plasmo-import-scheme',

    resolveId(id) {
      const matched = matchScheme(id);
      if (!matched) return null;

      // vite に「解決済みの仮想モジュール」として扱わせる
      return PREFIX + id;
    },

    load(id) {
      if (!id.startsWith(PREFIX)) return null;

      const matched = matchScheme(id.slice(PREFIX.length));
      if (!matched) return null;

      const { scheme, filePath } = matched;
      const absolutePath = path.resolve(projectRoot, filePath);

      if (!fs.existsSync(absolutePath)) {
        throw new Error(
          `Plasmo スキームのファイルが見つからない: ${scheme}${filePath}`
        );
      }

      if (scheme === 'data-base64:') {
        const ext = path.extname(absolutePath).toLowerCase();
        const mime = MIME_TYPES[ext] ?? 'application/octet-stream';
        const base64 = fs.readFileSync(absolutePath).toString('base64');
        return `export default ${JSON.stringify(`data:${mime};base64,${base64}`)};`;
      }

      if (scheme === 'data-text:' || scheme === 'raw:') {
        const text = fs.readFileSync(absolutePath, 'utf8');
        return `export default ${JSON.stringify(text)};`;
      }

      // url: は vite の通常のアセット解決に委ねる
      return `import url from ${JSON.stringify(absolutePath + '?url')};\nexport default url;`;
    }
  };
}
