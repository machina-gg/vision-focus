/**
 * manifest 権限の差分検知スクリプト。
 *
 * wxt.config.ts の manifest.permissions / manifest.host_permissions を
 * base ブランチ（比較元）と比較し、エントリが増えている場合に fail する。
 * Chrome 拡張は権限が広がるほど攻撃面（1 つの XSS/サプライチェーン汚染からの
 * 被害範囲）が広がるため、権限の追加は必ず人間のレビューを通す。
 *
 * 使い方:
 *   tsx scripts/check-manifest-permissions.ts <base-wxt-config-path> <head-wxt-config-path>
 *
 * CI からは base ブランチの wxt.config.ts をリポジトリ直下に書き出して渡す
 * （.github/workflows/security.yml 参照）。リポジトリ直下に置くのは、
 * 設定ファイルが `wxt` を import しており、node の解決がファイルの位置から
 * 上位ディレクトリを辿って node_modules を探すため。
 */
import { pathToFileURL } from 'node:url';

/** manifest.permissions / manifest.host_permissions を表す型 */
export interface ManifestPermissions {
  permissions: string[];
  hostPermissions: string[];
}

/** 差分検知の結果 */
export interface PermissionDiff {
  addedPermissions: string[];
  removedPermissions: string[];
  addedHostPermissions: string[];
  removedHostPermissions: string[];
}

/**
 * 設定オブジェクト（wxt.config.ts の default export）から manifest 権限を抽出する。
 * manifest / permissions / host_permissions が存在しない場合は空配列扱いにする。
 *
 * ⚠ manifest が関数（WXT がサポートするブラウザ別の動的 manifest）の場合は
 * 静的に読めないため、呼び出し側の isStaticManifest で先に弾く
 */
export function extractPermissions(config: unknown): ManifestPermissions {
  const manifest =
    typeof config === 'object' && config !== null && 'manifest' in config
      ? (config as { manifest?: unknown }).manifest
      : undefined;

  const permissions =
    typeof manifest === 'object' &&
    manifest !== null &&
    'permissions' in manifest
      ? (manifest as { permissions?: unknown }).permissions
      : undefined;

  const hostPermissions =
    typeof manifest === 'object' &&
    manifest !== null &&
    'host_permissions' in manifest
      ? (manifest as { host_permissions?: unknown }).host_permissions
      : undefined;

  return {
    permissions: Array.isArray(permissions)
      ? permissions.filter((p) => typeof p === 'string')
      : [],
    hostPermissions: Array.isArray(hostPermissions)
      ? hostPermissions.filter((p) => typeof p === 'string')
      : []
  };
}

/**
 * base（比較元）と head（比較先）の権限セットを比較し、増減した権限を返す。
 * 集合比較のため、並び順の変化は差分として扱わない。
 */
export function diffPermissions(
  base: ManifestPermissions,
  head: ManifestPermissions
): PermissionDiff {
  const baseSet = new Set(base.permissions);
  const headSet = new Set(head.permissions);
  const baseHostSet = new Set(base.hostPermissions);
  const headHostSet = new Set(head.hostPermissions);

  return {
    addedPermissions: [...headSet].filter((p) => !baseSet.has(p)),
    removedPermissions: [...baseSet].filter((p) => !headSet.has(p)),
    addedHostPermissions: [...headHostSet].filter((p) => !baseHostSet.has(p)),
    removedHostPermissions: [...baseHostSet].filter((p) => !headHostSet.has(p))
  };
}

/** 増えた権限が 1 つでもあるかどうか */
export function hasAddedPermissions(diff: PermissionDiff): boolean {
  return (
    diff.addedPermissions.length > 0 || diff.addedHostPermissions.length > 0
  );
}

/** fail 時に「どの権限が増えたか」を明示するメッセージを組み立てる */
export function formatDiffReport(diff: PermissionDiff): string {
  const lines: string[] = [];

  if (diff.addedPermissions.length > 0) {
    lines.push(`  permissions が増加: ${diff.addedPermissions.join(', ')}`);
  }
  if (diff.addedHostPermissions.length > 0) {
    lines.push(
      `  host_permissions が増加: ${diff.addedHostPermissions.join(', ')}`
    );
  }
  if (diff.removedPermissions.length > 0) {
    lines.push(
      `  (参考) permissions が減少: ${diff.removedPermissions.join(', ')}`
    );
  }
  if (diff.removedHostPermissions.length > 0) {
    lines.push(
      `  (参考) host_permissions が減少: ${diff.removedHostPermissions.join(', ')}`
    );
  }

  return lines.join('\n');
}

/**
 * manifest が静的なオブジェクトかどうか。
 * 関数形式だと権限を静的に読めず、検査が黙って素通りしてしまうため、
 * 読めないときは検査を通さず異常終了させる（fail-close）
 */
export function isStaticManifest(config: unknown): boolean {
  if (typeof config !== 'object' || config === null) return true;
  const manifest = (config as { manifest?: unknown }).manifest;
  return typeof manifest !== 'function';
}

/**
 * wxt.config.ts を読み込み、default export を返す。
 * base 側は「まだ wxt.config.ts が無いブランチ」を指すことがあり、
 * その場合は空ファイルが渡るので空オブジェクトを返す
 */
async function loadWxtConfig(path: string): Promise<unknown> {
  const module = await import(pathToFileURL(path).href);
  return module.default ?? {};
}

async function main(): Promise<void> {
  const [baseArg, headArg] = process.argv.slice(2);

  if (!baseArg || !headArg) {
    // CLI ツールとしての使用方法エラーを表示する目的の標準出力
    console.error(
      'Usage: tsx scripts/check-manifest-permissions.ts <base-wxt-config-path> <head-wxt-config-path>'
    );
    process.exit(2);
  }

  const baseConfig = await loadWxtConfig(baseArg);
  const headConfig = await loadWxtConfig(headArg);

  if (!isStaticManifest(baseConfig) || !isStaticManifest(headConfig)) {
    // 静的に読めない manifest を「権限ゼロ」と誤読しないよう、検査を通さず止める
    console.error(
      '❌ manifest が関数形式のため権限を静的に読めません。検査できないので fail させます。'
    );
    process.exit(2);
  }

  const base = extractPermissions(baseConfig);
  const head = extractPermissions(headConfig);
  const diff = diffPermissions(base, head);

  if (hasAddedPermissions(diff)) {
    // CI 上でどの権限が増えたかを明示するための標準出力
    console.error('❌ manifest の権限が増加しています。レビューが必要です:');
    console.error(formatDiffReport(diff));
    process.exit(1);
  }

  // CI 上で正常終了を明示するための標準出力
  console.log('✅ manifest の権限に増加はありません。');
  if (
    diff.removedPermissions.length > 0 ||
    diff.removedHostPermissions.length > 0
  ) {
    console.log(formatDiffReport(diff));
  }
}

// vitest から import された際は実行しない（テストは純粋関数のみを対象にする）
if (
  process.argv[1] &&
  process.argv[1].endsWith('check-manifest-permissions.ts')
) {
  // top-level await は使わない。package.json に "type": "module" が無く、
  // CI の `pnpm exec tsx` が本ファイルを CJS として変換するため
  // 「Top-level await is currently not supported」で常に落ちる（#417）
  main().catch((error: unknown) => {
    // 想定外の例外（設定ファイルの読み込み失敗など）も CI を止める
    console.error(error);
    process.exit(1);
  });
}
