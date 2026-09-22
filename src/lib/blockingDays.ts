import { MS_PER_DAY } from '~/constants/intervals';
import { matchesDomain } from '~/lib/domain';
import type { BlockItem } from '~/types/storage';

// 遮られたドメインが何日ブロックリストに載っているかを求める。
// 項目の照合はブロッカーと同じ matchesDomain を使う（サブドメイン・ワイルドカードも同じ規則で拾う）
export function calculateBlockingDays(
  domain: string,
  blockList: BlockItem[],
  now: Date = new Date()
): number | null {
  const blockItem = blockList.find((item) => matchesDomain(domain, item));

  if (!blockItem?.createdAt) return null;

  const createdDate = new Date(blockItem.createdAt);
  const diffTime = now.getTime() - createdDate.getTime();
  const diffDays = Math.floor(diffTime / MS_PER_DAY);

  return Math.max(1, diffDays);
}
