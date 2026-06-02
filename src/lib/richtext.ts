// Render the markdown stored by Tina's rich-text field to safe HTML.
// Tina saves rich-text as a markdown string in the JSON file (the editor
// parses it with parseMDX), so we render that same string with `marked`,
// then run it through sanitize-html so an editor (or a leaked content
// token) can't ship inline scripts, event handlers, or javascript: hrefs
// to visitors.
import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

marked.setOptions({
  gfm: true,
  breaks: false, // hard breaks come from two trailing spaces ("  \n")
});

const SANITIZE_OPTS: sanitizeHtml.IOptions = {
  allowedTags: [
    'p', 'br', 'em', 'strong', 'code', 'blockquote',
    'h1', 'h2', 'h3', 'h4',
    'ul', 'ol', 'li',
    'a',
    'figure', 'figcaption', 'img',
  ],
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: { img: ['http', 'https'] },
  allowProtocolRelative: false,
  // Force external links to be safe (no reverse-tabnabbing) and don't
  // leak referrer to third-party destinations.
  transformTags: {
    a: (tagName, attribs) => {
      const href = attribs.href || '';
      const isExternal = /^https?:\/\//i.test(href);
      const out: Record<string, string> = { ...attribs };
      if (isExternal) {
        out.target = '_blank';
        out.rel = 'noopener noreferrer';
      }
      return { tagName, attribs: out };
    },
  },
};

export function richTextToHtml(content: string | null | undefined): string {
  if (!content || typeof content !== 'string') return '';
  const raw = marked.parse(content, { async: false }) as string;
  return sanitizeHtml(raw, SANITIZE_OPTS);
}
