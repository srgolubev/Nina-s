// Cloudflare Worker: generate an on-brand image for a post and commit it
// to the repo. Called by the "Generate image" button in the Tina admin.
//
// Secrets (wrangler secret put): OPENAI_API_KEY, GITHUB_TOKEN
// Vars (wrangler.toml):          GITHUB_REPO, GITHUB_BRANCH, ALLOWED_ORIGIN

const BRAND_STYLE =
  'Soft, calm, representational fine-art illustration for a quiet coaching ' +
  'brand called "Tranquil Haven". A recurring, recognisable world: a peaceful ' +
  'coastal harbour at golden hour — calm water, a small white lighthouse, a ' +
  'few gently moored sailboats, a quiet sandy shore, soft sky. ' +
  'Coastal sunset palette: warm sand, cream, muted teal and soft gold. ' +
  'Gentle natural light, serene and unhurried mood, soft depth, subtle grain. ' +
  'Any people are small and distant, faces never in focus. ' +
  'No text, no words, no letters, no logos.';

function buildPrompt({ title, excerpt, category }) {
  const theme = [title, excerpt].filter(Boolean).join(' — ');
  return (
    `${BRAND_STYLE} ` +
    `Show a gentle, real scene within this tranquil harbour that quietly ` +
    `reflects the feeling of: "${theme}". ` +
    `Keep it representational and grounded — a calm place a viewer could ` +
    `imagine sitting in — not abstract shapes. Square composition.`
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

// Convert an ArrayBuffer to base64 in chunks (avoids call-stack overflow on
// large images).
function arrayBufferToBase64(buf) {
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
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

    // 1) Generate the image with Google Gemini ("nano-banana": gemini-2.5
    //    -flash-image). No org verification needed, just an AI Studio key.
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
        return json({ error: 'gemini', detail: await aiRes.text() }, 502, cors);
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
        return json({ error: 'no image returned', detail: JSON.stringify(aiData).slice(0, 500) }, 502, cors);
      }
    } catch (e) {
      return json({ error: 'gemini request failed', detail: String(e) }, 502, cors);
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
