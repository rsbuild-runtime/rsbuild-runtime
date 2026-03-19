import { defineConfig } from 'umi';

export default defineConfig({
  nodeModulesTransform: {
    type: 'none',
  },
  routes: [
    { exact: true, path: '/', redirect: '/home' },
    {
      title: 'content',
      component: '@/layouts',
      wrappers: ['@/components/wrapper'],
      routes: [
        {
          title: 'home',
          path: '/home',
          component: 'home',
        },
        {
          title: 'user',
          path: '/user',
          routes: [
            { title: 'userinfo', path: 'info', component: '@/pages/user/info' },
            {
              title: 'userdashboard',
              path: '/user/dashboard',
              component: '@/pages/user/dashboard',
            },
          ],
        },
      ],
    },
  ],
  fastRefresh: {},
});
