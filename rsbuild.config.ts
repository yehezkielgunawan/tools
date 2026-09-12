import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginTailwindcss } from '@rsbuild/plugin-tailwindcss';
import { homePageMetadata } from './src/seo/pageMetadata';

// Docs: https://rsbuild.rs/config/
export default defineConfig({
  html: {
    favicon: './public/yehezgun-tools-favicon.svg',
    title: homePageMetadata.browserTitle,
    meta: {
      description: homePageMetadata.description,
      'og:type': {
        property: 'og:type',
        content: 'website',
      },
      'og:title': {
        property: 'og:title',
        content: homePageMetadata.browserTitle,
      },
      'og:description': {
        property: 'og:description',
        content: homePageMetadata.description,
      },
      'og:url': {
        property: 'og:url',
        content: homePageMetadata.canonicalUrl,
      },
      'og:site_name': {
        property: 'og:site_name',
        content: 'Yehezgun Tools',
      },
      'og:image': {
        property: 'og:image',
        content: homePageMetadata.ogImageUrl,
      },
      'og:image:alt': {
        property: 'og:image:alt',
        content: homePageMetadata.imageTitle,
      },
      'og:image:type': {
        property: 'og:image:type',
        content: 'image/png',
      },
      'og:image:width': {
        property: 'og:image:width',
        content: '1200',
      },
      'og:image:height': {
        property: 'og:image:height',
        content: '630',
      },
      'twitter:card': {
        name: 'twitter:card',
        content: 'summary_large_image',
      },
      'twitter:creator': {
        name: 'twitter:creator',
        content: '@yehezgun',
      },
      'twitter:title': {
        name: 'twitter:title',
        content: homePageMetadata.browserTitle,
      },
      'twitter:description': {
        name: 'twitter:description',
        content: homePageMetadata.description,
      },
      'twitter:image': {
        name: 'twitter:image',
        content: homePageMetadata.ogImageUrl,
      },
      'twitter:image:alt': {
        name: 'twitter:image:alt',
        content: homePageMetadata.imageTitle,
      },
    },
    tags: [
      {
        tag: 'link',
        attrs: {
          rel: 'canonical',
          href: homePageMetadata.canonicalUrl,
        },
      },
    ],
  },
  plugins: [pluginReact(), pluginTailwindcss()],
});
