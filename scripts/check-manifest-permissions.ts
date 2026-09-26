// base 側の wxt.config.ts はリポジトリ直下に置いて渡す（中の `wxt` の import を node_modules から解決させるため）
import { pathToFileURL } from 'node:url';

export interface ManifestPermissions {
  permissions: string[];
  hostPermissions: string[];
}

export interface PermissionDiff {
  addedPermissions: string[];
  removedPermissions: string[];
  addedHostPermissions: string[];
  removedHostPermissions: string[];
}

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

export function hasAddedPermissions(diff: PermissionDiff): boolean {
  return (
    diff.addedPermissions.length > 0 || diff.addedHostPermissions.length > 0
  );
}

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

export function isStaticManifest(config: unknown): boolean {
  if (typeof config !== 'object' || config === null) return true;
  const manifest = (config as { manifest?: unknown }).manifest;
  return typeof manifest !== 'function';
}

// base 側は wxt.config.ts がまだ無いブランチだと空ファイルが渡る
async function loadWxtConfig(path: string): Promise<unknown> {
  const module = await import(pathToFileURL(path).href);
  return module.default ?? {};
}

async function main(): Promise<void> {
  const [baseArg, headArg] = process.argv.slice(2);

  if (!baseArg || !headArg) {
    console.error(
      'Usage: tsx scripts/check-manifest-permissions.ts <base-wxt-config-path> <head-wxt-config-path>'
    );
    process.exit(2);
  }

  const baseConfig = await loadWxtConfig(baseArg);
  const headConfig = await loadWxtConfig(headArg);

  if (!isStaticManifest(baseConfig) || !isStaticManifest(headConfig)) {
    console.error(
      '❌ manifest が関数形式のため権限を静的に読めません。検査できないので fail させます。'
    );
    process.exit(2);
  }

  const base = extractPermissions(baseConfig);
  const head = extractPermissions(headConfig);
  const diff = diffPermissions(base, head);

  if (hasAddedPermissions(diff)) {
    console.error('❌ manifest の権限が増加しています。レビューが必要です:');
    console.error(formatDiffReport(diff));
    process.exit(1);
  }

  console.log('✅ manifest の権限に増加はありません。');
  if (
    diff.removedPermissions.length > 0 ||
    diff.removedHostPermissions.length > 0
  ) {
    console.log(formatDiffReport(diff));
  }
}

if (
  process.argv[1] &&
  process.argv[1].endsWith('check-manifest-permissions.ts')
) {
  // top-level await は使わない（tsx が CJS として変換するので常に落ちる）
  main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
