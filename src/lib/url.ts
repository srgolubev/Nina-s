// Prefixes site-internal paths with Astro's configured base path, so links
// and assets work both at a domain root and under a GitHub Pages subpath
// (e.g. /Nina-s/). External URLs of allowed schemes and #anchors are
// returned untouched; unknown schemes (javascript:, data:, vbscript:, …)
// are reduced to "#" so a malicious or mistaken editor value cannot ship.
const BASE = import.meta.env.BASE_URL;

// Allow-list of URL schemes we'll ever emit into href / src attributes from
// editor-controlled content. Anything outside this list becomes "#".
const SAFE_SCHEME = /^(?:https?|mailto|tel):/i;

export function withBase(path: string | undefined | null): string {
  if (!path) return path ?? '';
  if (path.startsWith('#') || path.startsWith('//')) return path;
  if (/^[a-z]+:/i.test(path)) {
    return SAFE_SCHEME.test(path) ? path : '#';
  }
  return BASE.replace(/\/$/, '') + '/' + path.replace(/^\//, '');
}

/**
 * Return the given URL if it's safe to put in an `href`, otherwise "#".
 *
 * Editor-controlled values (footer links, contact channel URLs, navigation
 * hrefs, package booking links) reach the DOM through this so a malicious or
 * mistaken `javascript:...` value cannot ship to visitors.
 */
export function safeHref(url: string | undefined | null): string {
  if (!url) return '#';
  const trimmed = String(url).trim();
  if (trimmed.startsWith('#') || trimmed.startsWith('/')) return trimmed;
  if (SAFE_SCHEME.test(trimmed)) return trimmed;
  return '#';
}
