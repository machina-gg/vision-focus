import { describe, expectTypeOf, it } from 'vitest';

import type {
  TimeLimit as AnalyticsTimeLimit,
  TimeLimitType as AnalyticsTimeLimitType
} from '~/types/analytics';
import type { TimeLimit, TimeLimitType } from '~/types/site';
import type { TimeLimit as StorageTimeLimit } from '~/types/storage';

// 型の置き場所を site.ts へ移しても、既存の import 元が同じ型を指し続けることを型検査で確かめる
describe('TimeLimit の再エクスポート', () => {
  it('~/types/analytics の TimeLimit は site.ts と同じ型', () => {
    expectTypeOf<AnalyticsTimeLimit>().toEqualTypeOf<TimeLimit>();
    expectTypeOf<AnalyticsTimeLimitType>().toEqualTypeOf<TimeLimitType>();
  });

  it('~/types/storage の TimeLimit は site.ts と同じ型', () => {
    expectTypeOf<StorageTimeLimit>().toEqualTypeOf<TimeLimit>();
  });
});
