// Cloudflare Worker: generate an on-brand image for a post and commit it
// to the repo. Called by the "Generate image" button in the Tina admin.
//
// Secrets (wrangler secret put): OPENAI_API_KEY, GITHUB_TOKEN
// Vars (wrangler.toml):          GITHUB_REPO, GITHUB_BRANCH, ALLOWED_ORIGIN

const BRAND_STYLE =
  'Soft, calm, minimal fine-art illustration for a quiet coaching brand. ' +
  'Coastal sunset palette: warm sand, cream, muted teal and soft gold. ' +
  'Gentle natural light, lots of negative space, serene and unhurried mood, ' +
  'subtle grain, no text, no words, no letters, no logos, no people faces in focus.';

function buildPrompt({ title, excerpt, category }) {
  const theme = [title, excerpt].filter(Boolean).join(' — ');
  return (
    `${BRAND_STYLE} ` +
    `The image should evoke the feeling of this reflection: "${theme}". ` +
    `Abstract and atmospheric rather than literal. Square composition.`
  );
}

function corsHeaders(env) {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

function json(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

const slugify = (s) =>
  String(s || 'post')
    .toLowerCase()
    .replace(/['’"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'post';

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
    throw new Error(`GitHub commit failed: ${putRes.status} ${await putRes.text()}`);
  }
}

export default {
  async fetch(request, env) {
    const cors = corsHeaders(env);

    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405, cors);

    // Optional shared secret (set SHARED_SECRET to require it).
    if (env.SHARED_SECRET) {
      const auth = request.headers.get('Authorization') || '';
      if (auth !== `Bearer ${env.SHARED_SECRET}`) return json({ error: 'unauthorized' }, 401, cors);
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return json({ error: 'invalid JSON' }, 400, cors);
    }

    const slug = slugify(payload.slug || payload.title);
    const prompt = buildPrompt(payload);

    // 1) Generate the image with OpenAI.
    let b64;
    try {
      const aiRes = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt,
          size: '1024x1024',
          n: 1,
          response_format: 'b64_json',
        }),
      });
      if (!aiRes.ok) {
        return json({ error: 'openai', detail: await aiRes.text() }, 502, cors);
      }
      const aiData = await aiRes.json();
      b64 = aiData.data && aiData.data[0] && aiData.data[0].b64_json;
      if (!b64) return json({ error: 'no image returned' }, 502, cors);
    } catch (e) {
      return json({ error: 'openai request failed', detail: String(e) }, 502, cors);
    }

    // 2) Commit it to the repo.
    const path = `public/images/posts/${slug}.png`;
    try {
      await commitToGitHub(env, path, b64, `Add generated image for ${slug}`);
    } catch (e) {
      return json({ error: 'commit failed', detail: String(e) }, 502, cors);
    }

    // 3) Return the public path + an inline preview for the editor.
    return json(
      { image: `/images/posts/${slug}.png`, preview: `data:image/png;base64,${b64}` },
      200,
      cors,
    );
  },
};
