import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginTailwindcss } from '@rsbuild/plugin-tailwindcss';
import { pluginPWA } from 'rsbuild-plugin-pwa';
import {
  parseChangelog,
  validateCurrentRelease,
} from './src/config/parseChangelog';
import { homePageMetadata } from './src/seo/pageMetadata';

const packageJson = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as { version: string };

const changelog = parseChangelog(
  readFileSync(new URL('./CHANGELOG.md', import.meta.url), 'utf8'),
);
const require = createRequire(import.meta.url);
const pdfjsDistDirectory = dirname(require.resolve('pdfjs-dist/package.json'));

validateCurrentRelease(packageJson.version, changelog);

// Docs: https://rsbuild.rs/config/
export default defineConfig({
  source: {
    define: {
      __APP_VERSION__: JSON.stringify(packageJson.version),
      __CHANGELOG__: JSON.stringify(changelog),
    },
  },
  output: {
    copy: [
      {
        from: resolve(pdfjsDistDirectory, 'cmaps'),
        to: 'static/pdfjs/cmaps',
      },
      {
        from: resolve(pdfjsDistDirectory, 'iccs'),
        to: 'static/pdfjs/iccs',
      },
      {
        from: resolve(pdfjsDistDirectory, 'standard_fonts'),
        to: 'static/pdfjs/standard_fonts',
      },
      {
        from: resolve(pdfjsDistDirectory, 'wasm'),
        to: 'static/pdfjs/wasm',
        globOptions: { ignore: ['**/*.wasm'] },
      },
    ],
  },
  html: {
    favicon: './public/yehezgun-tools-favicon.svg',
    title: homePageMetadata.browserTitle,
    meta: {
      description: homePageMetadata.description,
      'theme-color': {
        name: 'theme-color',
        content: '#1478ff',
      },
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
      {
        tag: 'link',
        attrs: {
          href: '/apple-touch-icon.png',
          rel: 'apple-touch-icon',
        },
      },
    ],
  },
  plugins: [
    pluginReact(),
    pluginTailwindcss(),
    pluginPWA({
      registerSw: {
        scope: '/',
        type: 'virtual-module',
      },
      sw: {
        includeWebAppManifestIcons: true,
        mode: 'generateSw',
        workboxOptions: {
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          globPatterns: [
            '**/*.{js,css,html,ico,png,svg,webp,avif,jpg,jpeg,woff,woff2,json,webmanifest,bcmap,pfb,ttf,icc}',
          ],
          navigateFallback: '/index.html',
          skipWaiting: false,
          globIgnores: ['**/*.wasm'],
        },
      },
      webAppManifest: {
        content: {
          background_color: '#f7faff',
          description:
            'A customized collection of focused tools, organized in one place and ready whenever I need them.',
          display: 'standalone',
          icons: [
            {
              purpose: 'any',
              sizes: '192x192',
              src: '/pwa-icon-192.png',
              type: 'image/png',
            },
            {
              purpose: 'any',
              sizes: '512x512',
              src: '/pwa-icon-512.png',
              type: 'image/png',
            },
            {
              purpose: 'maskable',
              sizes: '512x512',
              src: '/pwa-maskable-512.png',
              type: 'image/png',
            },
          ],
          id: '/',
          name: 'Yehezgun Tools',
          orientation: 'any',
          scope: '/',
          short_name: 'Yehezgun Tools',
          start_url: '/',
          theme_color: '#1478ff',
        },
      },
    }),
  ],
});
