import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginUmi } from '../packages/umi-compat/src/index';
import { pluginLess } from '@rsbuild/plugin-less';
import path from 'node:path';

export default defineConfig({
  plugins: [
    pluginReact(),
    pluginUmi(),
    pluginLess({
      lessLoaderOptions: {
        implementation: require('less'),
      },
    }),
  ],
  resolve: {
    alias: {
      '@rsbuild-runtime/core': path.resolve(__dirname, '../packages/core/src'),
      'rsbuild-plugin-runtime': path.resolve(
        __dirname,
        '../packages/plugin/src',
      ),
      'rsbuild-plugin-umi': path.resolve(
        __dirname,
        '../packages/umi-compat/src',
      ),
    },
  },
  output: {
    cssModules: {
      auto(resource) {
        if (resource.includes('home.less')) return false;
        return resource.includes('.less');
      },
    },
  },
  dev: {
    watchFiles: [
      {
        type: 'reload-server',
        paths: ['../packages/rsbuild-plugin-runtime'],
      },
    ],
  },
  resolve: {
    alias: {},
  },
});
