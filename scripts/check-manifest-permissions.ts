/**
 * manifest 権限の差分検知スクリプト。
 *
 * package.json の manifest.permissions / manifest.host_permissions を
 * base ブランチ（比較元）と比較し、エントリが増えている場合に fail する。
 * Chrome 拡張は権限が広がるほど攻撃面（1 つの XSS/サプライチェーン汚染からの
 * 被害範囲）が広がるため、権限の追加は必ず人間のレビューを通す。
 *
 * 使い方:
 *   tsx scripts/check-manifest-permissions.ts <base-package-json-path> <head-package-json-path>
 *
 * CI からは base ブランチの package.json を一時ファイルに書き出して渡す
 * （.github/workflows/security.yml 参照）。
 */
import { readFileSync } from 'node:fs';

/** package.json の manifest.permissions / manifest.host_permissions を表す型 */
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
 * package.json の JSON オブジェクトから manifest 権限を抽出する。
 * manifest / permissions / host_permissions が存在しない場合は空配列扱いにする。
 */
export function extractPermissions(pkg: unknown): ManifestPermissions {
  const manifest =
    typeof pkg === 'object' && pkg !== null && 'manifest' in pkg
      ? (pkg as { manifest?: unknown }).manifest
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

function readPackageJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf-8'));
}

function main(): void {
  const [baseArg, headArg] = process.argv.slice(2);

  if (!baseArg || !headArg) {
    // CLI ツールとしての使用方法エラーを表示する目的の標準出力
    console.error(
      'Usage: tsx scripts/check-manifest-permissions.ts <base-package-json-path> <head-package-json-path>'
    );
    process.exit(2);
  }

  const base = extractPermissions(readPackageJson(baseArg));
  const head = extractPermissions(readPackageJson(headArg));
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
  main();
}
