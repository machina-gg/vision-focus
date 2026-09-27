import { describe, expect, it } from 'vitest';

import { createSerialQueue } from '~/lib/serialQueue';

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe('createSerialQueue', () => {
  it('投入順に 1 つずつ走らせる（前の処理が終わるまで次を始めない）', async () => {
    const enqueue = createSerialQueue();
    const log: string[] = [];
    const task = (name: string, ticks: number) => async () => {
      log.push(`${name}:start`);
      for (let i = 0; i < ticks; i++) await tick();
      log.push(`${name}:end`);
      return name;
    };

    const results = await Promise.all([
      enqueue(task('a', 3)),
      enqueue(task('b', 1)),
      enqueue(task('c', 0))
    ]);

    expect(results).toEqual(['a', 'b', 'c']);
    expect(log).toEqual([
      'a:start',
      'a:end',
      'b:start',
      'b:end',
      'c:start',
      'c:end'
    ]);
  });

  it('前の処理が失敗しても後の処理は走り、失敗はその呼び出しだけに返る', async () => {
    const enqueue = createSerialQueue();
    const failing = enqueue(async () => {
      await tick();
      throw new Error('failed');
    });
    const following = enqueue(async () => 'ok');

    await expect(failing).rejects.toThrow('failed');
    await expect(following).resolves.toBe('ok');
  });

  it('別に作った待ち行列どうしは互いを待たない', async () => {
    const first = createSerialQueue();
    const second = createSerialQueue();
    const log: string[] = [];

    await Promise.all([
      first(async () => {
        await tick();
        await tick();
        log.push('first');
      }),
      second(async () => {
        log.push('second');
      })
    ]);

    expect(log).toEqual(['second', 'first']);
  });
});
