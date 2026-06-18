// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Local dev and CI leave BASE_PATH unset, so the site is served from the
// domain root. (Earlier we deployed under /Nina-s on GitHub Pages — that
// path-prefix is no longer used now that the site lives on its own
// domain.)
const base = process.env.BASE_PATH || undefined;

// https://astro.build/config
export default defineConfig({
  // Custom domain for the deployed site. Used for canonical / OG /
  // sitemap absolute URLs.
  site: 'https://tranquilhaven.coach',
  base,
  integrations: [sitemap()],
});
