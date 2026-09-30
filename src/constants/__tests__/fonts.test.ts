import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import { describe, it, expect } from 'vitest';

import { FONT_WEIGHT_VALUE } from '../fonts';
import { FONT_CATEGORIES } from '~/types/font';

// vitest はリポジトリのルートで走る。jsdom 環境では import.meta.url が file: にならないので cwd を起点にする
const require = createRequire(path.resolve(process.cwd(), 'package.json'));

const fontsCss = readFileSync(
  path.resolve(process.cwd(), 'src/styles/fonts.css'),
  'utf8'
);

const importedSpecifiers = [...fontsCss.matchAll(/@import '([^']+)';/g)]
  .map((match) => match[1])
  .filter((specifier): specifier is string => specifier !== undefined);

/** fonts.css が読む Fontsource の CSS が宣言する「font-family 名 → 太さ」の一覧 */
const declaredFaces = new Map<string, Set<number>>();
for (const specifier of importedSpecifiers) {
  const css = readFileSync(require.resolve(specifier), 'utf8');
  for (const [, body = ''] of css.matchAll(/@font-face\s*{([^}]*)}/g)) {
    const family = /font-family:\s*'([^']+)'/.exec(body)?.[1];
    const weight = /font-weight:\s*(\d+)/.exec(body)?.[1];
    if (!family || !weight) continue;
    const weights = declaredFaces.get(family) ?? new Set<number>();
    weights.add(Number(weight));
    declaredFaces.set(family, weights);
  }
}

const bundledFonts = Object.values(FONT_CATEGORIES)
  .flatMap((category) => category.fonts)
  .filter((font) => font.family !== 'system');

const firstFamilyName = (css: string) => /^'([^']+)'/.exec(css)?.[1];

describe('同梱フォント', () => {
  it('fonts.css が Fontsource の CSS を読んでいる', () => {
    expect(importedSpecifiers.length).toBeGreaterThan(0);
    expect(importedSpecifiers.every((s) => s.startsWith('@fontsource/'))).toBe(
      true
    );
  });

  it.each(bundledFonts.map((font) => [font.name, font.css]))(
    '%s の css の先頭の名前が Fontsource の font-family と一致し、標準の太さが宣言されている',
    (_name, css) => {
      const family = firstFamilyName(css);
      expect(family).toBeDefined();
      expect(declaredFaces.get(family ?? '')).toContain(
        FONT_WEIGHT_VALUE.normal
      );
    }
  );

  it('選択肢に無い書体・太さを読まない', () => {
    const familyNames = new Set(
      bundledFonts.map((f) => firstFamilyName(f.css))
    );
    const weightValues = new Set(Object.values(FONT_WEIGHT_VALUE));

    for (const [family, weights] of declaredFaces) {
      expect(familyNames).toContain(family);
      for (const weight of weights) {
        expect(weightValues).toContain(weight);
      }
    }
  });
});
