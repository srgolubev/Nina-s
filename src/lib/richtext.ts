// Render the markdown stored by Tina's rich-text field to HTML.
// Tina saves rich-text as a markdown string in the JSON file (the editor
// parses it with parseMDX), so we render that same string with `marked`.
import { marked } from 'marked';

marked.setOptions({
  gfm: true,
  breaks: false, // hard breaks come from two trailing spaces ("  \n")
});

export function richTextToHtml(content: string | null | undefined): string {
  if (!content || typeof content !== 'string') return '';
  return marked.parse(content, { async: false }) as string;
}
