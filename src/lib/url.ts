// Prefixes site-internal paths with Astro's configured base path, so links
// and assets work both at a domain root and under a GitHub Pages subpath
// (e.g. /Nina-s/). External URLs and #anchors are returned untouched.
const BASE = import.meta.env.BASE_URL;

export function withBase(path: string | undefined | null): string {
  if (!path) return path ?? '';
  if (/^[a-z]+:/i.test(path) || path.startsWith('//') || path.startsWith('#')) {
    return path;
  }
  return BASE.replace(/\/$/, '') + '/' + path.replace(/^\//, '');
}
