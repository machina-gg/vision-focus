import { vi } from 'vitest';

import { getRedirectedHosts } from '../blocker';

/**
 * 転送していたホストを、作り直しの前と後で順に返すようにする（呼ぶ側のテストで ../blocker をモックしておく）
 * @param before 作り直しの前に転送していたホスト
 * @param after 作り直しの後に転送しているホスト
 */
export function givenRedirectedHosts(before: string[], after: string[]): void {
  vi.mocked(getRedirectedHosts)
    .mockReset()
    .mockResolvedValueOnce(before)
    .mockResolvedValueOnce(after);
}
