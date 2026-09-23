import { expect, test } from '@rstest/core';
import {
  buildOgImageUrl,
  getPageMetadata,
  homePageMetadata,
} from '../src/seo/pageMetadata';

test('resolves homepage metadata with the approved copy', () => {
  expect(homePageMetadata).toEqual({
    browserTitle: 'Yehezgun Tools | My unified toolkit',
    imageTitle: 'Yehezgun Tools',
    description:
      'A customized collection of focused tools, organized in one place and ready whenever I need them.',
    canonicalUrl: 'https://tools.yehezgun.com/',
    ogImageUrl:
      'https://og-image-rev.yehezgun.com/og?title=Yehezgun+Tools&description=A+customized+collection+of+focused+tools%2C+organized+in+one+place+and+ready+whenever+I+need+them.&siteName=tools.yehezgun.com&social=yehezgun.com&cta=Explore+tools+%E2%86%92&image=https%3A%2F%2Ftools.yehezgun.com%2Fyehezgun-tools-og-logo.png',
  });
});

test('resolves metadata for the registered WhatsApp tool', () => {
  expect(getPageMetadata('/generator/whatsapp-link')).toEqual({
    browserTitle: 'WhatsApp Link Generator | Yehezgun Tools',
    imageTitle: 'WhatsApp Link Generator',
    description: 'Create a ready-to-share wa.me link with an optional message.',
    canonicalUrl: 'https://tools.yehezgun.com/generator/whatsapp-link',
    ogImageUrl:
      'https://og-image-rev.yehezgun.com/og?title=WhatsApp+Link+Generator&description=Create+a+ready-to-share+wa.me+link+with+an+optional+message.&siteName=tools.yehezgun.com&social=yehezgun.com&cta=Open+tool+%E2%86%92&image=https%3A%2F%2Ftools.yehezgun.com%2Fyehezgun-tools-og-logo.png',
  });
});

test('normalizes trailing slashes for registered tools', () => {
  expect(getPageMetadata('/developer/json-formatter/')).toEqual(
    getPageMetadata('/developer/json-formatter'),
  );
});

test('resolves metadata for the changelog page', () => {
  expect(getPageMetadata('/changelog/')).toMatchObject({
    browserTitle: 'Changelog | Yehezgun Tools',
    imageTitle: 'Yehezgun Tools Changelog',
    description: 'Release history and notable changes for Yehezgun Tools.',
    canonicalUrl: 'https://tools.yehezgun.com/changelog',
  });
});

test('returns no metadata for unknown routes', () => {
  expect(getPageMetadata('/not-a-tool')).toBeNull();
});

test('encodes all OG image parameters', () => {
  expect(
    buildOgImageUrl({
      title: 'A & B',
      description: 'Use / safely?',
      cta: 'Open tool →',
    }),
  ).toBe(
    'https://og-image-rev.yehezgun.com/og?title=A+%26+B&description=Use+%2F+safely%3F&siteName=tools.yehezgun.com&social=yehezgun.com&cta=Open+tool+%E2%86%92&image=https%3A%2F%2Ftools.yehezgun.com%2Fyehezgun-tools-og-logo.png',
  );
});
