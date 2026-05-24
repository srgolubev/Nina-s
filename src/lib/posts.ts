// Load every post JSON, normalise it, and expose helpers that the
// Inner Compass section pages share.

interface RawPost {
  category?: string;
  title?: string;
  slug?: string;
  publishedAt?: string;
  draft?: boolean;
  excerpt?: string;
  body?: unknown[];
}

export interface Post {
  category: string;
  title: string;
  slug: string;
  publishedAt: string;
  draft: boolean;
  excerpt: string;
  body: any[];
}

const modules = import.meta.glob<{ default: RawPost } | RawPost>(
  '../../content/posts/*.json',
  { eager: true },
);

const allPosts: Post[] = Object.values(modules)
  .map((m) => ('default' in (m as any) ? (m as any).default : m) as RawPost)
  .filter((p): p is RawPost => !!p && typeof p === 'object')
  .map((p) => ({
    category: String(p.category ?? ''),
    title: String(p.title ?? ''),
    slug: String(p.slug ?? ''),
    publishedAt: String(p.publishedAt ?? ''),
    draft: Boolean(p.draft),
    excerpt: String(p.excerpt ?? ''),
    body: Array.isArray(p.body) ? p.body : [],
  }))
  .filter((p) => p.category && p.slug && p.title);

const byDateDesc = (a: Post, b: Post) =>
  new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();

export function getPosts(category: string): Post[] {
  return allPosts
    .filter((p) => p.category === category && !p.draft)
    .sort(byDateDesc);
}
