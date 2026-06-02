// Cloudflare Worker: generate an on-brand image for a post and commit it
// to the repo. Called by the "Generate image" button in the Tina admin.
//
// Secrets (wrangler secret put): GEMINI_API_KEY, GITHUB_TOKEN
// Vars (wrangler.toml):          GITHUB_REPO, GITHUB_BRANCH, ALLOWED_ORIGIN
//                                (ALLOWED_ORIGIN may be a comma-separated
//                                 list of exact origins.)

const BRAND_STYLE =
  'Soft, calm, representational fine-art illustration for a quiet coaching ' +
  'brand called "Tranquil Haven". A recurring, recognisable world: a peaceful ' +
  'coastal harbour at golden hour — calm water, a small white lighthouse, a ' +
  'few gently moored sailboats, a quiet sandy shore, soft sky. ' +
  'Coastal sunset palette: warm sand, cream, muted teal and soft gold. ' +
  'Gentle natural light, serene and unhurried mood, soft depth, subtle grain. ' +
  'Any people are small and distant, faces never in focus. ' +
  'No text, no words, no letters, no logos.';

// Length caps on caller-supplied text so a malicious caller can't blow up our
// Gemini token spend or commit absurdly long filenames / messages.
const MAX_TITLE = 240;
const MAX_EXCERPT = 600;
const MAX_BODY = 4000;
const MAX_SLUG = 80;

function clip(s, n) {
  return typeof s === 'string' ? s.slice(0, n) : '';
}

function buildPrompt({ title, excerpt }) {
  const theme = [clip(title, MAX_TITLE), clip(excerpt, MAX_EXCERPT)]
    .filter(Boolean)
    .join(' — ');
  return (
    `${BRAND_STYLE} ` +
    `Show a gentle, real scene within this tranquil harbour that quietly ` +
    `reflects the feeling of: "${theme}". ` +
    `Keep it representational and grounded — a calm place a viewer could ` +
    `imagine sitting in — not abstract shapes. Square composition.`
  );
}

function allowedOrigins(env) {
  return (env.ALLOWED_ORIGIN || '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s && s !== '*');
}

function pickCorsOrigin(request, env) {
  const list = allowedOrigins(env);
  const origin = request.headers.get('Origin') || '';
  if (list.length === 0) return null; // explicit allow-list missing — refuse CORS
  return list.includes(origin) ? origin : null;
}

function corsHeaders(allowOrigin) {
  if (!allowOrigin) return {};
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

function json(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

function slugify(s) {
  return String(s || 'post')
    .toLowerCase()
    .replace(/['’"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG) || 'post';
}

async function commitToGitHub(env, path, contentB64, message) {
  const base = `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${path}`;
  const headers = {
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'thaven-image-worker',
    'Content-Type': 'application/json',
  };
  // If the file already exists we must pass its blob SHA to update it.
  let sha;
  const getRes = await fetch(`${base}?ref=${encodeURIComponent(env.GITHUB_BRANCH)}`, { headers });
  if (getRes.ok) {
    const existing = await getRes.json();
    sha = existing.sha;
  }
  const putRes = await fetch(base, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ message, content: contentB64, branch: env.GITHUB_BRANCH, sha }),
  });
  if (!putRes.ok) {
    const detail = await putRes.text();
    throw new Error(`gh ${putRes.status}: ${detail.slice(0, 200)}`);
  }
}

export default {
  async fetch(request, env) {
    const allowOrigin = pickCorsOrigin(request, env);
    const cors = corsHeaders(allowOrigin);

    if (request.method === 'OPTIONS') {
      // Preflight: still answer 204, but only echo the Origin if it's allowed.
      return new Response(null, { status: 204, headers: cors });
    }
    if (request.method !== 'POST') {
      return json({ error: 'method_not_allowed' }, 405, cors);
    }

    // Same-origin check: refuse browsers from any origin we don't trust, AND
    // refuse non-browser callers (curl with no Origin) outright. This is the
    // primary defence — Origin headers cannot be set by ordinary JS in a
    // victim browser.
    if (!allowOrigin) {
      return json({ error: 'forbidden' }, 403, cors);
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return json({ error: 'invalid_json' }, 400, cors);
    }

    // Validate / clip every caller-supplied field. Reject anything obviously
    // suspicious so we never commit, or spend Gemini tokens on, an attacker's
    // payload.
    const title = clip(payload.title, MAX_TITLE);
    const excerpt = clip(payload.excerpt, MAX_EXCERPT);
    // body is currently unused in the prompt but cap it defensively in case
    // we ever use it.
    clip(payload.body, MAX_BODY);
    const slug = slugify(payload.slug || payload.title);
    if (!SLUG_RE.test(slug)) {
      return json({ error: 'invalid_slug' }, 400, cors);
    }
    if (!title) {
      return json({ error: 'missing_title' }, 400, cors);
    }

    const prompt = buildPrompt({ title, excerpt });

    // 1) Generate the image with Google Gemini ("nano-banana").
    let b64;
    try {
      const model = 'gemini-2.5-flash-image';
      const url =
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent` +
        `?key=${encodeURIComponent(env.GEMINI_API_KEY)}`;
      const aiRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ['IMAGE'] },
        }),
      });
      if (!aiRes.ok) {
        console.error('gemini', aiRes.status, await aiRes.text());
        return json({ error: 'upstream_failed' }, 502, cors);
      }
      const aiData = await aiRes.json();
      const parts =
        (aiData.candidates &&
          aiData.candidates[0] &&
          aiData.candidates[0].content &&
          aiData.candidates[0].content.parts) ||
        [];
      const imgPart = parts.find((p) => p.inlineData || p.inline_data);
      const inline = imgPart && (imgPart.inlineData || imgPart.inline_data);
      b64 = inline && inline.data;
      if (!b64) {
        console.error('gemini no image', JSON.stringify(aiData).slice(0, 500));
        return json({ error: 'no_image' }, 502, cors);
      }
    } catch (e) {
      console.error('gemini exception', String(e));
      return json({ error: 'upstream_failed' }, 502, cors);
    }

    // 2) Commit to the repo at a server-controlled path. The slug has been
    //    re-slugified above (with cap + regex check), so it cannot escape
    //    public/images/posts/.
    const path = `public/images/posts/${slug}.png`;
    try {
      await commitToGitHub(env, path, b64, `Add generated image for ${slug}`);
    } catch (e) {
      console.error('commit', String(e));
      return json({ error: 'commit_failed' }, 502, cors);
    }

    // 3) Return the public path + an inline preview for the editor.
    return json(
      { image: `/images/posts/${slug}.png`, preview: `data:image/png;base64,${b64}` },
      200,
      cors,
    );
  },
};
