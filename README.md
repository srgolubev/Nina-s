# TranquilHaven Coaching

Website for TranquilHaven Coaching, built with [Astro](https://astro.build)
and editable through [TinaCMS](https://tina.io) — a Git-based CMS, so every
content change is saved as a commit and the site rebuilds automatically.

## Local development

```bash
npm install
npm run dev
```

- Site: http://localhost:4321
- Content editor (admin): http://localhost:4321/admin

`npm run dev` runs Astro and TinaCMS together. In local mode the admin edits
the content files directly — no account needed.

## Editing content

All editable text and images live in plain files under `content/`:

- `content/pages/home.json` — homepage (hero, three cards, call-to-action)
- `content/global/site.json` — header & footer (logo, menu, social links, disclaimer)

Non-technical editors should use the **`/admin`** form editor rather than
editing the JSON by hand. The Astro pages read these files and render the site.

## Preview on GitHub Pages

A GitHub Actions workflow (`.github/workflows/deploy.yml`) builds the site and
publishes it to GitHub Pages on every push to `claude/review-plan-website-f8xS4`
(and can be run manually from the Actions tab).

**One-time setup:** in the repository, open **Settings → Pages** and set
**Source** to **GitHub Actions**. The workflow also attempts to enable this
automatically on its first run.

Live preview: **https://srgolubev.github.io/Nina-s/**

This is the public site only — the `/admin` editor is not part of the Pages
preview (it needs TinaCMS Cloud, see below). The Pages build runs with
`BASE_PATH=/Nina-s` because a project site is served from a subpath.

## Connecting the admin for production

The hosted `/admin` needs a free TinaCMS Cloud project so editors can log in
and save from the live site:

1. Go to https://app.tina.io and create a project, connecting this GitHub repo.
2. Copy the **Client ID** and create a **Read/Write Token**.
3. Add them as environment variables on the host (and in a local `.env`,
   see `.env.example`):
   - `TINA_CLIENT_ID`
   - `TINA_TOKEN`
   - `GITHUB_BRANCH` (the branch content is committed to, e.g. `main`)
4. Set the host's build command to `npm run build:cms`.

## Deployment

Host on Netlify, Vercel, or Cloudflare Pages (static output):

- Build command: `npm run build` (site only) or `npm run build:cms` (site + `/admin`)
- Publish directory: `dist`

A content change made in `/admin` commits to the repo, which triggers a
rebuild and deploy.

## Project structure

```
content/            Editable content (managed by TinaCMS)
public/images/      Image assets
src/
  layouts/Base.astro      HTML shell, fonts, global styles
  components/             Header, Footer
  pages/index.astro       Homepage
  styles/global.css       Design system + all styles
tina/config.ts      TinaCMS schema (which fields the admin shows)
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Astro + TinaCMS dev servers |
| `npm run build` | Build the static site to `dist/` |
| `npm run build:cms` | Build the site **and** the hosted `/admin` (needs Tina Cloud env vars) |
| `npm run preview` | Preview the production build locally |
