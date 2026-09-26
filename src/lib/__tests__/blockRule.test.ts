import { describe, expect, it } from 'vitest';

import { evaluateBlock, type BlockContext } from '~/lib/blockRule';
import type { BlockRule } from '~/types/site';

const LIMIT_SECONDS = 1800;

const alwaysRule: Pick<BlockRule, 'enabled' | 'timeLimit'> = {
  enabled: true,
  timeLimit: null
};

const limitedRule: Pick<BlockRule, 'enabled' | 'timeLimit'> = {
  enabled: true,
  timeLimit: { type: 'daily', limitSeconds: LIMIT_SECONDS }
};

function ctx(overrides: Partial<BlockContext> = {}): BlockContext {
  return {
    paused: false,
    scheduleActive: true,
    todaySeconds: 0,
    ...overrides
  };
}

describe('evaluateBlock - スケジュール内 / 外 × 常時 / 時間制限', () => {
  it('スケジュール内 × 常時ブロック → ブロック', () => {
    expect(evaluateBlock(alwaysRule, ctx({ scheduleActive: true }))).toEqual({
      blocked: true,
      reason: 'always_blocked'
    });
  });

  it('スケジュール外 × 常時ブロック → 閲覧可', () => {
    expect(evaluateBlock(alwaysRule, ctx({ scheduleActive: false }))).toEqual({
      blocked: false,
      reason: null
    });
  });

  it('スケジュール内 × 時間制限（上限未満）→ 閲覧可で残り秒数を返す', () => {
    expect(
      evaluateBlock(
        limitedRule,
        ctx({ scheduleActive: true, todaySeconds: 600 })
      )
    ).toEqual({
      blocked: false,
      reason: null,
      remainingSeconds: LIMIT_SECONDS - 600
    });
  });

  it('スケジュール内 × 時間制限（上限ちょうど）→ ブロック', () => {
    expect(
      evaluateBlock(
        limitedRule,
        ctx({ scheduleActive: true, todaySeconds: LIMIT_SECONDS })
      )
    ).toEqual({
      blocked: true,
      reason: 'time_limit_exceeded',
      remainingSeconds: 0
    });
  });

  it('スケジュール内 × 時間制限（上限超過）→ ブロック', () => {
    expect(
      evaluateBlock(
        limitedRule,
        ctx({ scheduleActive: true, todaySeconds: LIMIT_SECONDS + 1 })
      )
    ).toEqual({
      blocked: true,
      reason: 'time_limit_exceeded',
      remainingSeconds: 0
    });
  });

  it('スケジュール外 × 時間制限（上限未満）→ 閲覧可', () => {
    expect(
      evaluateBlock(
        limitedRule,
        ctx({ scheduleActive: false, todaySeconds: 600 })
      )
    ).toEqual({ blocked: false, reason: null });
  });

  it('スケジュール外 × 時間制限（上限超過）→ 閲覧可（制限には使わない）', () => {
    expect(
      evaluateBlock(
        limitedRule,
        ctx({ scheduleActive: false, todaySeconds: LIMIT_SECONDS * 2 })
      )
    ).toEqual({ blocked: false, reason: null });
  });
});

describe('evaluateBlock - 一時停止とブロック有効', () => {
  it('一時停止中は常時ブロックでも閲覧可', () => {
    expect(evaluateBlock(alwaysRule, ctx({ paused: true }))).toEqual({
      blocked: false,
      reason: null
    });
  });

  it('一時停止中は時間制限を超えていても閲覧可', () => {
    expect(
      evaluateBlock(
        limitedRule,
        ctx({ paused: true, todaySeconds: LIMIT_SECONDS * 2 })
      )
    ).toEqual({ blocked: false, reason: null });
  });

  it('ブロックのトグルが OFF なら閲覧可', () => {
    expect(
      evaluateBlock(
        { ...limitedRule, enabled: false },
        ctx({ todaySeconds: LIMIT_SECONDS * 2 })
      )
    ).toEqual({ blocked: false, reason: null });
    expect(evaluateBlock({ ...alwaysRule, enabled: false }, ctx())).toEqual({
      blocked: false,
      reason: null
    });
  });

  it('ブロック対象でないサイト（rule が null）は閲覧可', () => {
    expect(evaluateBlock(null, ctx())).toEqual({
      blocked: false,
      reason: null
    });
  });
});
