# Tranquil Haven — image generation Worker

A tiny Cloudflare Worker that powers the **"Generate image from post"**
button in the Tina admin. It takes a post's title/excerpt/body, asks
OpenAI to draw a calm, on-brand image, commits the PNG into the repo at
`public/images/posts/<slug>.png`, and returns the path (plus a base64
preview for instant display in the editor).

The OpenAI key and GitHub token live **only** inside the Worker as
secrets — they never reach the browser.

## One-time setup

1. **Install the CLI** (if you don't have it):
   ```
   npm install -g wrangler
   wrangler login
   ```

2. **Create the Worker** (from this folder):
   ```
   cd workers/generate-image
   wrangler deploy
   ```
   Wrangler prints the Worker URL, e.g.
   `https://thaven-image.<your-subdomain>.workers.dev`. Copy it.

3. **Add the secrets** (you'll be prompted to paste each value):
   ```
   wrangler secret put OPENAI_API_KEY     # from platform.openai.com
   wrangler secret put GITHUB_TOKEN       # a fine-grained PAT, see below
   ```

4. **Set the plain vars** in `wrangler.toml` (already filled in, change
   if needed): `GITHUB_REPO`, `GITHUB_BRANCH`, `ALLOWED_ORIGIN`.

5. **Tell Tina the Worker URL**: open
   `tina/fields/GenerateImageButton.tsx` and replace `WORKER_URL` with
   the URL from step 2, then commit. The admin rebuild will wire the
   button to your Worker.

### GitHub token

Create a **fine-grained personal access token**
(github.com → Settings → Developer settings → Fine-grained tokens):
- Repository access: only `srgolubev/nina-s`
- Permissions: **Contents → Read and write**

That's the minimum the Worker needs to commit the generated image.

## Cost

Each image is one OpenAI image generation (DALL·E 3, ~$0.04–0.08).
Cloudflare Workers' free tier is plenty for this volume.

## Re-deploying after changes

```
cd workers/generate-image
wrangler deploy
```
