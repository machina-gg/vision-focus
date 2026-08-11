import type { StorybookConfig } from '@storybook/react-vite';

import { plasmoSchemePlugin } from './plasmoSchemePlugin';

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    '@storybook/addon-onboarding',
    '@storybook/addon-essentials',
    '@chromatic-com/storybook',
    '@storybook/addon-interactions'
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {}
  },
  viteFinal: async (config) => {
    return {
      ...config,
      // Plasmo 独自の import スキーム（data-base64: 等）を解決する。
      // これがないと Header / options のストーリーがビルドできない
      plugins: [...(config.plugins ?? []), plasmoSchemePlugin(process.cwd())],
      resolve: {
        ...config.resolve,
        alias: {
          ...config.resolve?.alias,
          '~': `${process.cwd()}/src`
        }
      }
    };
  }
};

export default config;
