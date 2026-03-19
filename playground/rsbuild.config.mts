import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginUmiMigration } from 'rsbuild-plugin-runtime';
import { pluginLess } from '@rsbuild/plugin-less';

export default defineConfig({
  plugins: [
    pluginReact(),
    pluginUmiMigration(),
    pluginLess({
      lessLoaderOptions: {
        implementation: require('less'),
      },
    }),
  ],
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
