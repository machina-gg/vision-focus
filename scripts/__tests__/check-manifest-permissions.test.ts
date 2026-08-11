import { describe, expect, it } from 'vitest';
import {
  diffPermissions,
  extractPermissions,
  formatDiffReport,
  hasAddedPermissions
} from '../check-manifest-permissions';

describe('extractPermissions', () => {
  it('package.json から manifest の権限を抽出できる', () => {
    const pkg = {
      manifest: {
        permissions: ['storage', 'tabs'],
        host_permissions: ['<all_urls>']
      }
    };

    expect(extractPermissions(pkg)).toEqual({
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
