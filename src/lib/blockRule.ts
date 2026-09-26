import type { BlockRule } from '~/types/site';

/** ブロックの理由。null = ブロックしていない */
export type BlockReason = 'always_blocked' | 'time_limit_exceeded' | null;

/** ブロックの判定結果。remainingSeconds は時間制限が効いているときの今日の残り秒数 */
export interface BlockState {
  /** ブロックするなら true */
  blocked: boolean;
  /** ブロックの理由（ブロックしないなら null） */
  reason: BlockReason;
  /** 時間制限が効いているときの今日の残り秒数（使い切ったら 0。時間制限が効いていなければ無い） */
  remainingSeconds?: number;
}

/** evaluateBlock に渡す、サイトの設定以外の判定材料。todaySeconds は今日そのサイトが表示されていた秒数 */
export interface BlockContext {
  /** 利用者がブロックを一時停止しているか */
  paused: boolean;
  /** ブロックが効く時間帯か（有効なスケジュールが無ければ常に true） */
  scheduleActive: boolean;
  /** 今日そのサイトが表示されていた秒数 */
  todaySeconds: number;
}

const NOT_BLOCKED: BlockState = { blocked: false, reason: null };

/**
 * 一時停止・スケジュール・有効フラグ・時間制限の順に見て、ブロックの判定結果を返す
 * @param rule サイトのブロック設定（ブロック設定が無ければ null）
 * @param ctx サイトの設定以外の判定材料
 * @returns ブロックの判定結果
 */
// ブロック条件はここにだけ並べる（呼び出し側で足すと、開いているページの判定と新しい遷移を止めるルールが食い違う）
export function evaluateBlock(
  rule: Pick<BlockRule, 'enabled' | 'timeLimit'> | null,
  ctx: BlockContext
): BlockState {
  if (ctx.paused) return NOT_BLOCKED;
  if (!ctx.scheduleActive) return NOT_BLOCKED;
  if (!rule || !rule.enabled) return NOT_BLOCKED;

  if (!rule.timeLimit) {
    return { blocked: true, reason: 'always_blocked' };
  }

  const remainingSeconds = rule.timeLimit.limitSeconds - ctx.todaySeconds;
  if (remainingSeconds <= 0) {
    return {
      blocked: true,
      reason: 'time_limit_exceeded',
      remainingSeconds: 0
    };
  }
  return { blocked: false, reason: null, remainingSeconds };
}
