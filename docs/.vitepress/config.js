import { defineConfig } from 'vitepress';

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'Nextbone',
  description: 'Backbone reimagined',
  base: '/nextbone/',
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [{ text: 'Home', link: '/' }, { text: 'Documentation', link: '/introduction' }],

    sidebar: [
      {
        text: 'Overview',
        items: [
          { text: 'Introduction', link: '/introduction' },
          { text: 'Get started', link: '/get-started' }
        ]
      },
      {
        text: 'Core API',
        items: [
          { text: 'Events', link: '/events' },
          { text: 'Model', link: '/model' },
          { text: 'Collection', link: '/collection' }
        ]
      }
    ],

    socialLinks: [{ icon: 'github', link: 'https://github.com/blikblum/nextbone' }]
  }
});
