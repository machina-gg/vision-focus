import {
  blockExistingTabs,
  getRedirectedHosts,
  updateBlockRules
} from './blocker';

/**
 * ルールを作り直し、作り直す前に転送していなかったホストが転送の対象に入ったときだけ、開いているタブをブロック画面へ移す
 * @param before 変更の前に getRedirectedHosts で読んだ、転送していたホスト（保存の後に読むと、保存を見て作り直す watcher が先に対象を入れ替えて差が消える）
 */
export async function updateBlockRulesAndBlockNewTargets(
  before: readonly string[]
): Promise<void> {
  await updateBlockRules();

  // 件数では比べない（有効化と時間帯の終了が重なると、件数を変えずに対象が入れ替わる）
  const after = await getRedirectedHosts();
  const hasNewlyBlocked = after.some((host) => !before.includes(host));

  // ルールは新しい遷移にしか効かないため、開いているタブは明示的に移す
  if (hasNewlyBlocked) {
    await blockExistingTabs();
  }
}
