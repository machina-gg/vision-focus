import { createRequire } from 'node:module';
import path from 'node:path';

import postcss, { type PluginCreator } from 'postcss';
import { describe, it, expect } from 'vitest';

const require = createRequire(path.resolve(process.cwd(), 'package.json'));
const woff2Only =
  require('./scripts/postcss-woff2-only.cjs') as PluginCreator<void>;

const run = async (css: string) =>
  (await postcss([woff2Only()]).process(css, { from: undefined })).css;

describe('postcss-woff2-only', () => {
  it('@font-face の src から woff の候補を落とし、woff2 を残す', async () => {
    const css = await run(
      "@font-face { font-family: 'Inter'; src: url(./files/a.woff2) format('woff2'), url(./files/a.woff) format('woff'); }"
    );

    expect(css).toContain("src: url(./files/a.woff2) format('woff2');");
    expect(css).not.toContain('a.woff)');
  });

  it('woff2 の候補が無い src は書き換えない', async () => {
    const source =
      "@font-face { font-family: 'X'; src: url(./x.woff) format('woff'); }";

    expect(await run(source)).toBe(source);
  });

  it('@font-face の外の src は書き換えない', async () => {
    const source =
      ".a { src: url(./a.woff2) format('woff2'), url(./a.woff) format('woff'); }";

    expect(await run(source)).toBe(source);
  });

  it('url() の中のカンマで候補を割らない', async () => {
    const css = await run(
      "@font-face { src: url('data:font/woff2;base64,AA,BB') format('woff2'), url(b.woff) format('woff'); }"
    );

    expect(css).toContain(
      "src: url('data:font/woff2;base64,AA,BB') format('woff2');"
    );
  });
});
