// Render a Tina rich-text AST (the JSON saved by the rich-text field) to an
// HTML string. The content comes from our own repo / the Tina editor, but we
// still escape text nodes so stray angle brackets can't break the markup.
import { withBase } from './url';

interface Node {
  type?: string;
  text?: string;
  children?: Node[];
  url?: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  [key: string]: unknown;
}

export interface RichText {
  type?: string;
  children?: Node[];
}

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const isExternal = (url: string) => /^[a-z]+:/i.test(url) || url.startsWith('//');

function renderInline(node: Node): string {
  if (node.type === 'break') return '<br />';
  if (typeof node.text === 'string') {
    let html = escapeHtml(node.text);
    if (node.bold) html = `<strong>${html}</strong>`;
    if (node.italic) html = `<em>${html}</em>`;
    if (node.code) html = `<code>${html}</code>`;
    return html;
  }
  if (node.type === 'a') {
    const url = node.url || '#';
    const ext = isExternal(url);
    const href = ext ? url : withBase(url);
    const attrs = ext ? ' target="_blank" rel="noopener noreferrer"' : '';
    return `<a href="${escapeHtml(href)}"${attrs}>${renderChildren(node)}</a>`;
  }
  return renderChildren(node);
}

function renderChildren(node: Node): string {
  return (node.children || []).map(renderNode).join('');
}

function renderNode(node: Node): string {
  switch (node.type) {
    case 'p':
      return `<p>${renderChildren(node)}</p>`;
    case 'h1':
      return `<h1>${renderChildren(node)}</h1>`;
    case 'h2':
      return `<h2>${renderChildren(node)}</h2>`;
    case 'h3':
      return `<h3>${renderChildren(node)}</h3>`;
    case 'h4':
      return `<h4>${renderChildren(node)}</h4>`;
    case 'blockquote':
      return `<blockquote>${renderChildren(node)}</blockquote>`;
    case 'ul':
      return `<ul class="block-list">${renderChildren(node)}</ul>`;
    case 'ol':
      return `<ol class="block-list">${renderChildren(node)}</ol>`;
    case 'li':
      return `<li>${renderChildren(node)}</li>`;
    case 'lic':
      // list-item content wrapper — render inline, no extra element
      return renderChildren(node);
    case 'br':
    case 'break':
      return '<br />';
    case 'a':
    case 'text':
      return renderInline(node);
    default:
      // Unknown block with children → render children; leaf → inline/text
      if (node.children) return renderChildren(node);
      return renderInline(node);
  }
}

export function richTextToHtml(content: RichText | null | undefined): string {
  if (!content || !Array.isArray(content.children)) return '';
  return content.children.map(renderNode).join('');
}
