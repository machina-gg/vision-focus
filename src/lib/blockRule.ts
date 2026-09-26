import type { BlockRule } from '~/types/site';

export type BlockReason = 'always_blocked' | 'time_limit_exceeded' | null;

export interface BlockState {
  blocked: boolean;
  reason: BlockReason;
  remainingSeconds?: number;
}

export interface BlockContext {
  paused: boolean;
  scheduleActive: boolean;
  todaySeconds: number;
}

const NOT_BLOCKED: BlockState = { blocked: false, reason: null };

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
