// @ts-check
import { defineConfig } from 'astro/config';

// For a GitHub Pages project site the build runs with BASE_PATH=/Nina-s
// (set in .github/workflows/deploy.yml). Local dev and other hosts leave it
// unset, so the site is served from the domain root.
const base = process.env.BASE_PATH || undefined;

// https://astro.build/config
export default defineConfig({
  site: 'https://srgolubev.github.io',
  base,
});
