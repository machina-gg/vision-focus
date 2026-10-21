import { describe, expect, it } from 'vitest';

import { formatMinutes } from '../chartUtils';

describe('formatMinutes', () => {
  it('1 分未満は秒で出す', () => {
    expect(formatMinutes(0.75)).toBe('45s');
  });

  it('1 時間未満は分、それ以上は時間と分で出す', () => {
    expect(formatMinutes(12)).toBe('12m');
    expect(formatMinutes(65)).toBe('1h 5m');
  });

  it('端数の秒は切り捨てる', () => {
    expect(formatMinutes(3580 / 60)).toBe('59m');
  });

  it('軸の単位変換で出る浮動小数点の誤差で 1 秒ずれない', () => {
    // 時間単位の軸を経由した値（分 → 時間 → 分）
    expect(formatMinutes((7380 / 3600) * 60)).toBe('2h 3m');
  });
});
