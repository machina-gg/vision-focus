import { describe, expect, it, vi, beforeEach } from 'vitest';

/**
 * chrome.storage のモック。
 *
 * @wxt-dev/storage は読み込み時に `globalThis.chrome` を掴むため、import より前に用意する。
 * local 領域は値を実際に保持し、get / set を 1 tick 遅らせる。
 * 遅らせないと「読む → 変える → 書く」の間に別の書き込みが割り込む状況が作れず、
 * 直列化を外しても検査が落ちない
 */
const fakeChrome = vi.hoisted(() => {
  const localData: Record<string, unknown> = {};
  const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

  const localArea = {
    get: async (keys?: string | string[]) => {
      await tick();
      if (typeof keys === 'string') {
        return { [keys]: structuredClone(localData[keys]) };
      }
      if (Array.isArray(keys)) {
        return Object.fromEntries(
          keys.map((key) => [key, structuredClone(localData[key])])
        );
      }
      return structuredClone(localData);
    },
    set: async (items: Record<string, unknown>) => {
      await tick();
      Object.assign(localData, structuredClone(items));
    },
    remove: async (key: string | string[]) => {
      await tick();
      for (const k of Array.isArray(key) ? key : [key]) delete localData[k];
    },
    onChanged: { addListener: vi.fn(), removeListener: vi.fn() }
  };

  (globalThis as Record<string, unknown>).chrome = {
    runtime: { id: 'test-extension' },
    storage: { local: localArea, session: { get: vi.fn(), set: vi.fn() } }
  };

  return {
    localData,
    reset: () => {
      for (const key of Object.keys(localData)) delete localData[key];
    }
  };
});

import {
  addBlock,
  addTrackedSite,
  getTrackedSiteKeys,
  importSites,
  removeBlock,
  setBlockEnabled,
  setTimeLimit,
  stopTracking,
  trackedSiteKeys,
  updateYouTubeSite
} from '~/lib/siteService';
import { YOUTUBE_DOMAIN } from '~/lib/siteKey';
import {
  blockedSite,
  sitesOf,
  trackedSite,
  youtubeFeatures
} from '~/test/sites';
import type { TrackedSites } from '~/types/site';

const NOW = new Date('2026-09-26T03:00:00.000Z');
const LIMIT = { type: 'daily' as const, limitSeconds: 600 };

const stored = () => fakeChrome.localData.sites as TrackedSites | undefined;
const givenSites = (sites: TrackedSites) => {
  fakeChrome.localData.sites = structuredClone(sites);
};

beforeEach(() => {
  fakeChrome.reset();
});

describe('trackedSiteKeys / getTrackedSiteKeys', () => {
  it('保存済みのサイトキーを返す（未保存なら空）', async () => {
    expect(await getTrackedSiteKeys()).toEqual([]);

    givenSites(sitesOf(trackedSite('x.com'), blockedSite('youtube.com')));
    expect((await getTrackedSiteKeys()).sort()).toEqual([
      'x.com',
      'youtube.com'
    ]);
    expect(trackedSiteKeys(sitesOf(trackedSite('a.com')))).toEqual(['a.com']);
  });
});

describe('addBlock', () => {
  it('サイトが無ければ有効な常時ブロックのサイトを作る', async () => {
    expect(await addBlock('https://www.Reddit.com/r/x', NOW)).toEqual({
      site: 'reddit.com',
      rejection: null
    });
    expect(stored()).toEqual({
      'reddit.com': {
        domain: 'reddit.com',
        trackedAt: NOW.toISOString(),
        block: { enabled: true, addedAt: NOW.toISOString(), timeLimit: null },
        youtube: null
      }
    });
  });

  it('*. の表記も同じサイトキーにする', async () => {
    await addBlock('*.example.com', NOW);
    expect(Object.keys(stored())).toEqual(['example.com']);
  });

  it('追跡だけのサイトにはブロック設定を足し、追跡を始めた時刻は保つ', async () => {
    givenSites(
      sitesOf(trackedSite('x.com', { trackedAt: '2026-01-01T00:00:00.000Z' }))
    );

    expect((await addBlock('x.com', NOW)).rejection).toBeNull();
    expect(stored()['x.com']).toEqual({
      domain: 'x.com',
      trackedAt: '2026-01-01T00:00:00.000Z',
      block: { enabled: true, addedAt: NOW.toISOString(), timeLimit: null },
      youtube: null
    });
  });

  it('既にブロック設定を持つサイト（www. 付きの入力を含む）は重複として拒否する', async () => {
    givenSites(sitesOf(blockedSite('x.com')));
    expect((await addBlock('www.x.com', NOW)).rejection).toEqual({
      reason: 'duplicate'
    });
  });

  it('形式の誤りは拒否し、何も書かない', async () => {
    expect((await addBlock('localhost', NOW)).rejection).toEqual({
      reason: 'invalid'
    });
    expect(stored()).toBeUndefined();
  });

  it.each([
    ['子孫（既存が祖先）', 'youtube.com', 'm.youtube.com', 'ancestor'],
    [
      '子孫（www. 付きの既存が祖先）',
      'youtube.com',
      'music.www.youtube.com',
      'ancestor'
    ],
    ['祖先（既存が子孫）', 'mail.google.com', 'google.com', 'descendant']
  ] as const)(
    '入れ子になるキーは拒否する: %s',
    async (_label, existing, input, relation) => {
      givenSites(sitesOf(trackedSite(existing)));
      expect((await addBlock(input, NOW)).rejection).toEqual({
        reason: 'nested',
        nested: { site: existing, relation }
      });
      expect(Object.keys(stored())).toEqual([existing]);
    }
  );

  it('接尾辞が同じでも別のドメインは入れ子ではない', async () => {
    givenSites(sitesOf(trackedSite('example.com')));
    expect((await addBlock('badexample.com', NOW)).rejection).toBeNull();
  });

  it('同時に呼んでも片方の変更が消えない（書き込みを直列化する）', async () => {
    await Promise.all([
      addBlock('a.com', NOW),
      addBlock('b.com', NOW),
      addTrackedSite('c.com', NOW)
    ]);
    expect(Object.keys(stored()).sort()).toEqual(['a.com', 'b.com', 'c.com']);
  });
});

describe('addTrackedSite', () => {
  it('ブロック設定なしで追跡を始める', async () => {
    expect(
      (await addTrackedSite('news.example.org', NOW)).rejection
    ).toBeNull();
    expect(stored()['news.example.org']).toEqual({
      domain: 'news.example.org',
      trackedAt: NOW.toISOString(),
      block: null,
      youtube: null
    });
  });

  it('既に追跡中のサイトは重複として拒否する', async () => {
    givenSites(sitesOf(blockedSite('x.com')));
    expect((await addTrackedSite('x.com', NOW)).rejection).toEqual({
      reason: 'duplicate'
    });
  });

  it('入れ子になるキーは拒否する', async () => {
    givenSites(sitesOf(blockedSite('google.com')));
    expect((await addTrackedSite('mail.google.com', NOW)).rejection).toEqual({
      reason: 'nested',
      nested: { site: 'google.com', relation: 'ancestor' }
    });
  });
});

describe('removeBlock / setBlockEnabled / setTimeLimit', () => {
  it('removeBlock は block を null にして追跡を続け、外す前の設定を返す', async () => {
    givenSites(sitesOf(blockedSite('x.com')));
    const before = await removeBlock('x.com');
    expect(before?.enabled).toBe(true);
    expect(stored()['x.com'].block).toBeNull();
  });

  it('removeBlock はサイトもブロック設定も無ければ null', async () => {
    givenSites(sitesOf(trackedSite('x.com')));
    expect(await removeBlock('x.com')).toBeNull();
    expect(await removeBlock('none.com')).toBeNull();
  });

  it('setBlockEnabled は block.enabled だけを変え、切り替える前の設定を返す', async () => {
    givenSites(sitesOf(blockedSite('x.com', { timeLimit: LIMIT })));
    const before = await setBlockEnabled('x.com', false);
    expect(before?.enabled).toBe(true);
    expect(stored()['x.com'].block).toEqual({
      enabled: false,
      addedAt: '2024-01-01T00:00:00.000Z',
      timeLimit: LIMIT
    });
  });

  it('setBlockEnabled はブロック設定の無いサイトでは何もしない', async () => {
    givenSites(sitesOf(trackedSite('x.com')));
    expect(await setBlockEnabled('x.com', true)).toBeNull();
    expect(stored()['x.com'].block).toBeNull();
  });

  it('setTimeLimit はブロック設定の時間制限を変える（無ければ false）', async () => {
    givenSites(sitesOf(blockedSite('x.com'), trackedSite('y.com')));
    expect(await setTimeLimit('x.com', LIMIT)).toBe(true);
    expect(stored()['x.com'].block?.timeLimit).toEqual(LIMIT);
    expect(await setTimeLimit('y.com', LIMIT)).toBe(false);
  });
});

describe('updateYouTubeSite', () => {
  it('youtube.com が無ければ作り、YouTube 機能とブロック設定を書く', async () => {
    const before = await updateYouTubeSite(
      {
        youtube: youtubeFeatures({ hideShorts: true }),
        block: { enabled: true, timeLimit: LIMIT }
      },
      NOW
    );
    expect(before).toBeNull();
    expect(stored()[YOUTUBE_DOMAIN]).toEqual({
      domain: YOUTUBE_DOMAIN,
      trackedAt: NOW.toISOString(),
      block: { enabled: true, addedAt: NOW.toISOString(), timeLimit: LIMIT },
      youtube: youtubeFeatures({ hideShorts: true })
    });
  });

  it('ブロックリストに入れた時刻は既存のブロック設定から引き継ぎ、変更前のサイトを返す', async () => {
    const existing = blockedSite(YOUTUBE_DOMAIN);
    givenSites(sitesOf(existing));
    const before = await updateYouTubeSite(
      { youtube: null, block: { enabled: true, timeLimit: LIMIT } },
      NOW
    );
    expect(before).toEqual(existing);
    expect(stored()[YOUTUBE_DOMAIN].block?.addedAt).toBe(
      existing.block?.addedAt
    );
  });

  it('機能もブロックも外しても youtube.com は追跡中に残る', async () => {
    givenSites(
      sitesOf(blockedSite(YOUTUBE_DOMAIN, {}, { youtube: youtubeFeatures() }))
    );
    await updateYouTubeSite({ youtube: null, block: null }, NOW);
    expect(stored()[YOUTUBE_DOMAIN]).toMatchObject({
      block: null,
      youtube: null
    });
  });
});

describe('stopTracking', () => {
  it('追跡だけのサイトを消す', async () => {
    givenSites(sitesOf(trackedSite('x.com'), trackedSite('y.com')));
    expect(await stopTracking('x.com')).toBe('stopped');
    expect(Object.keys(stored())).toEqual(['y.com']);
  });

  it('ブロック設定か YouTube 機能を持つサイトは消さない', async () => {
    givenSites(
      sitesOf(
        blockedSite('x.com', { enabled: false }),
        trackedSite(YOUTUBE_DOMAIN, { youtube: youtubeFeatures() })
      )
    );
    expect(await stopTracking('x.com')).toBe('in-use');
    expect(await stopTracking(YOUTUBE_DOMAIN)).toBe('in-use');
    expect(Object.keys(stored()).sort()).toEqual(['x.com', YOUTUBE_DOMAIN]);
  });

  it('追跡中に無ければ not-found', async () => {
    expect(await stopTracking('none.com')).toBe('not-found');
  });
});

describe('importSites', () => {
  it('新しいサイトは正規化したキーで取り込み、既存の設定は上書きしない', async () => {
    givenSites(sitesOf(blockedSite('x.com', { enabled: false })));

    const result = await importSites(
      [
        blockedSite('www.New.com', { addedAt: '2025-05-05T00:00:00.000Z' }),
        blockedSite('x.com', { enabled: true, timeLimit: LIMIT })
      ],
      NOW
    );

    expect(result).toEqual({ changed: ['new.com'], skipped: [] });
    expect(stored()['new.com']).toEqual({
      domain: 'new.com',
      trackedAt: NOW.toISOString(),
      block: {
        enabled: true,
        addedAt: '2025-05-05T00:00:00.000Z',
        timeLimit: null
      },
      youtube: null
    });
    expect(stored()['x.com'].block?.enabled).toBe(false);
  });

  it('追跡だけの既存サイトにはブロック設定を足す', async () => {
    givenSites(sitesOf(trackedSite('x.com')));
    const result = await importSites([blockedSite('x.com')], NOW);
    expect(result.changed).toEqual(['x.com']);
    expect(stored()['x.com'].block?.enabled).toBe(true);
  });

  it('既存・ファイル内の先行サイトと入れ子になるものは取り込まず理由を返す', async () => {
    givenSites(sitesOf(trackedSite('google.com')));
    const result = await importSites(
      [
        blockedSite('mail.google.com'),
        blockedSite('reddit.com'),
        blockedSite('old.reddit.com')
      ],
      NOW
    );
    expect(result).toEqual({
      changed: ['reddit.com'],
      skipped: [
        {
          input: 'mail.google.com',
          nested: { site: 'google.com', relation: 'ancestor' }
        },
        {
          input: 'old.reddit.com',
          nested: { site: 'reddit.com', relation: 'ancestor' }
        }
      ]
    });
    expect(Object.keys(stored()).sort()).toEqual(['google.com', 'reddit.com']);
  });

  it('YouTube 機能は youtube.com 以外では取り込まない', async () => {
    await importSites(
      [
        trackedSite('x.com', { youtube: youtubeFeatures() }),
        trackedSite(YOUTUBE_DOMAIN, {
          youtube: youtubeFeatures({ hideComments: true })
        })
      ],
      NOW
    );
    expect(stored()['x.com'].youtube).toBeNull();
    expect(stored()[YOUTUBE_DOMAIN].youtube).toEqual(
      youtubeFeatures({ hideComments: true })
    );
  });

  it('変わるものが無ければ書かない', async () => {
    givenSites(sitesOf(blockedSite('x.com')));
    const result = await importSites(
      [blockedSite('x.com'), trackedSite('bad')],
      NOW
    );
    expect(result).toEqual({ changed: [], skipped: [] });
  });
});
