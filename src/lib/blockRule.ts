import type { BlockRule } from '~/types/site';

/** ブロックの理由。null = ブロックしていない */
export type BlockReason = 'always_blocked' | 'time_limit_exceeded' | null;

/** ブロックの判定結果 */
export interface BlockState {
  blocked: boolean;
  reason: BlockReason;
  /** 時間制限が効いているときの今日の残り秒数（スケジュール外・一時停止中は持たない） */
  remainingSeconds?: number;
}

export interface BlockContext {
  /** 全体の一時停止 */
  paused: boolean;
  /** ブロックが効く時間帯か（isBlockingWindowOpen(settings.schedules)。有効なスケジュールが 0 件なら true） */
  scheduleActive: boolean;
  /** 今日（ローカル日付）そのサイトが表示されていた秒数 */
  todaySeconds: number;
}

const NOT_BLOCKED: BlockState = { blocked: false, reason: null };

/**
 * ブロックの条件を並べるのはこの関数だけ。判定とルール生成の両方がここを通る。
 * 条件を呼び出し側で足すと、判定（開いているページ）とルール（新しい遷移）の結果が食い違う。
 *
 * 判定順: 一時停止 → スケジュール → ブロック有効 → 時間制限。
 * スケジュール外は時間制限つきでも閲覧できる（スケジュールがあれば全項目がスケジュール内だけブロックする）
 */
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
