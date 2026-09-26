import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  diffPermissions,
  extractPermissions,
  formatDiffReport,
  hasAddedPermissions,
  isStaticManifest
} from '../check-manifest-permissions';

describe('extractPermissions', () => {
  it('wxt.config.ts の default export から manifest の権限を抽出できる', () => {
    const config = {
      manifest: {
        permissions: ['storage', 'tabs'],
        host_permissions: ['<all_urls>']
      }
    };

    expect(extractPermissions(config)).toEqual({
      permissions: ['storage', 'tabs'],
      hostPermissions: ['<all_urls>']
    });
  });

  it('manifest が存在しない場合は空配列を返す', () => {
    expect(extractPermissions({})).toEqual({
      permissions: [],
      hostPermissions: []
    });
  });
});

describe('diffPermissions', () => {
  it('permissions が増えたケースを検出する', () => {
    const base = { permissions: ['storage'], hostPermissions: [] };
    const head = { permissions: ['storage', 'tabs'], hostPermissions: [] };

    const diff = diffPermissions(base, head);

    expect(diff.addedPermissions).toEqual(['tabs']);
    expect(diff.removedPermissions).toEqual([]);
    expect(hasAddedPermissions(diff)).toBe(true);
  });

  it('permissions が減ったケースは増加なしと判定する', () => {
    const base = { permissions: ['storage', 'tabs'], hostPermissions: [] };
    const head = { permissions: ['storage'], hostPermissions: [] };

    const diff = diffPermissions(base, head);

    expect(diff.addedPermissions).toEqual([]);
    expect(diff.removedPermissions).toEqual(['tabs']);
    expect(hasAddedPermissions(diff)).toBe(false);
  });

  it('変化なしのケースは増加なしと判定する', () => {
    const base = {
      permissions: ['storage', 'tabs'],
      hostPermissions: ['<all_urls>']
    };
    const head = {
      permissions: ['tabs', 'storage'],
      hostPermissions: ['<all_urls>']
    };

    const diff = diffPermissions(base, head);

    expect(hasAddedPermissions(diff)).toBe(false);
    expect(diff.addedPermissions).toEqual([]);
    expect(diff.addedHostPermissions).toEqual([]);
  });

  it('host_permissions のみが増えたケースを検出する', () => {
    const base = {
      permissions: ['storage'],
      hostPermissions: ['https://example.com/*']
    };
    const head = {
      permissions: ['storage'],
      hostPermissions: ['https://example.com/*', '<all_urls>']
    };

    const diff = diffPermissions(base, head);

    expect(diff.addedPermissions).toEqual([]);
    expect(diff.addedHostPermissions).toEqual(['<all_urls>']);
    expect(hasAddedPermissions(diff)).toBe(true);
  });
});

describe('formatDiffReport', () => {
  it('増加した権限を明示するメッセージを組み立てる', () => {
    const diff = diffPermissions(
      { permissions: [], hostPermissions: [] },
      { permissions: ['tabs'], hostPermissions: ['<all_urls>'] }
    );

    const report = formatDiffReport(diff);

    expect(report).toContain('tabs');
    expect(report).toContain('<all_urls>');
  });
});

describe('isStaticManifest', () => {
  it('manifest がオブジェクトなら静的と判定する', () => {
    expect(isStaticManifest({ manifest: { permissions: ['storage'] } })).toBe(
      true
    );
  });

  it('manifest が無い場合も静的と判定する', () => {
    expect(isStaticManifest({})).toBe(true);
  });

  it('manifest が関数の場合は静的でないと判定する', () => {
    expect(isStaticManifest({ manifest: () => ({ permissions: [] }) })).toBe(
      false
    );
  });
});

describe('CLI として起動したとき', () => {
  // tsx は "type": "module" が無いと .ts を CJS に変換し、top-level await で起動時に落ちるため実際に起動して確かめる
  const repoRoot = path.resolve(__dirname, '../..');
  const scriptPath = path.resolve(
    __dirname,
    '../check-manifest-permissions.ts'
  );
  const fixturesDir = path.resolve(__dirname, 'fixtures');
  const fixture = (name: string) => path.join(fixturesDir, name);

  function runScript(...args: string[]): {
    status: number;
    stdout: string;
    stderr: string;
  } {
    try {
      const stdout = execFileSync(
        process.execPath,
        ['--import', 'tsx', scriptPath, ...args],
        { cwd: repoRoot, encoding: 'utf8' }
      );
      return { status: 0, stdout, stderr: '' };
    } catch (error) {
      const failure = error as {
        status?: number | null;
        stdout?: string;
        stderr?: string;
      };
      return {
        status: typeof failure.status === 'number' ? failure.status : -1,
        stdout: failure.stdout ?? '',
        stderr: failure.stderr ?? ''
      };
    }
  }

  it('権限が同一なら 0 で終了する', () => {
    const result = runScript(
      fixture('base.config.ts'),
      fixture('base.config.ts')
    );

    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('権限に増加はありません');
    expect(result.status).toBe(0);
  });

  it('権限が増えていれば 1 で終了する', () => {
    const result = runScript(
      fixture('base.config.ts'),
      fixture('added.config.ts')
    );

    // 起動に失敗しても終了コードは 1 になるため、出力まで確かめる
    expect(result.stderr).toContain('permissions が増加: tabs');
    expect(result.status).toBe(1);
  });

  it('manifest が関数形式なら 2 で終了する', () => {
    const result = runScript(
      fixture('base.config.ts'),
      fixture('function-manifest.config.ts')
    );

    expect(result.stderr).toContain('関数形式');
    expect(result.status).toBe(2);
  });
});
