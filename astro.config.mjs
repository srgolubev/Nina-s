// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// For a GitHub Pages project site the build runs with BASE_PATH=/Nina-s
// (set in .github/workflows/deploy.yml). Local dev and other hosts leave it
// unset, so the site is served from the domain root.
const base = process.env.BASE_PATH || undefined;

// https://astro.build/config
export default defineConfig({
  // `site` is the absolute origin used to build canonical / OG / sitemap
  // URLs. Update this when a custom domain is attached.
  site: 'https://srgolubev.github.io',
  base,
  integrations: [sitemap()],
});
