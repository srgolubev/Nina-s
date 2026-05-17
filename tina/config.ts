import { defineConfig } from 'tinacms';

// The branch TinaCMS reads/writes content on. In CI/hosting this is set
// automatically; locally it falls back to "main".
const branch =
  process.env.GITHUB_BRANCH ||
  process.env.VERCEL_GIT_COMMIT_REF ||
  process.env.CF_PAGES_BRANCH ||
  process.env.HEAD ||
  'main';

export default defineConfig({
  branch,
  // From https://app.tina.io — only needed for the hosted /admin in production.
  clientId: process.env.TINA_CLIENT_ID || '',
  token: process.env.TINA_TOKEN || '',

  build: {
    outputFolder: 'admin',
    publicFolder: 'public',
  },
  media: {
    tina: {
      mediaRoot: 'images',
      publicFolder: 'public',
    },
  },

  schema: {
    collections: [
      {
        name: 'page',
        label: 'Pages',
        path: 'content/pages',
        format: 'json',
        ui: {
          // The homepage is the only page for now — keep editors from
          // creating or deleting page files by mistake.
          allowedActions: { create: false, delete: false },
          router: () => '/',
        },
        fields: [
          {
            type: 'object',
            name: 'seo',
            label: 'Page info (SEO)',
            fields: [
              { type: 'string', name: 'title', label: 'Browser tab title' },
              {
                type: 'string',
                name: 'description',
                label: 'Search-engine description',
                ui: { component: 'textarea' },
              },
            ],
          },
          {
            type: 'object',
            name: 'hero',
            label: 'Hero (top banner)',
            fields: [
              { type: 'image', name: 'image', label: 'Background photo' },
              {
                type: 'string',
                name: 'imageAlt',
                label: 'Background photo description (for screen readers)',
              },
              { type: 'string', name: 'welcome', label: 'Small line above the title' },
              { type: 'string', name: 'brand', label: 'Main headline' },
              { type: 'string', name: 'subtitle', label: 'Subtitle' },
              { type: 'string', name: 'ctaLabel', label: 'Button text' },
              { type: 'string', name: 'ctaHref', label: 'Button link' },
            ],
          },
          {
            type: 'object',
            name: 'cards',
            label: 'Three cards',
            list: true,
            ui: {
              itemProps: (item) => ({ label: item?.title || 'Card' }),
            },
            fields: [
              { type: 'string', name: 'title', label: 'Card title' },
              {
                type: 'string',
                name: 'variant',
                label: 'Image shape',
                options: [
                  { value: 'portrait', label: 'Round portrait' },
                  { value: 'standard', label: 'Rounded rectangle' },
                ],
              },
              {
                type: 'image',
                name: 'image',
                label: 'Photo (leave empty to show a placeholder)',
              },
              { type: 'string', name: 'imageAlt', label: 'Photo description (for screen readers)' },
              {
                type: 'string',
                name: 'body',
                label: 'Card text',
                ui: { component: 'textarea' },
              },
              { type: 'string', name: 'buttonLabel', label: 'Button text' },
              { type: 'string', name: 'buttonHref', label: 'Button link' },
              {
                type: 'string',
                name: 'buttonStyle',
                label: 'Button colour',
                options: [
                  { value: 'primary', label: 'Teal' },
                  { value: 'secondary', label: 'Tan' },
                ],
              },
            ],
          },
          {
            type: 'object',
            name: 'cta',
            label: 'Call-to-action band',
            fields: [
              { type: 'string', name: 'heading', label: 'Heading' },
              { type: 'string', name: 'text', label: 'Text' },
              { type: 'string', name: 'buttonLabel', label: 'Button text' },
              { type: 'string', name: 'buttonHref', label: 'Button link' },
            ],
          },
        ],
      },
      {
        name: 'global',
        label: 'Site settings (header & footer)',
        path: 'content/global',
        format: 'json',
        ui: {
          allowedActions: { create: false, delete: false },
        },
        fields: [
          { type: 'string', name: 'logoName', label: 'Logo name' },
          { type: 'string', name: 'logoCaption', label: 'Logo caption' },
          {
            type: 'object',
            name: 'nav',
            label: 'Navigation menu',
            list: true,
            ui: {
              itemProps: (item) => ({ label: item?.label || 'Menu item' }),
            },
            fields: [
              { type: 'string', name: 'label', label: 'Label' },
              { type: 'string', name: 'href', label: 'Link' },
            ],
          },
          {
            type: 'object',
            name: 'socials',
            label: 'Social links',
            list: true,
            ui: {
              itemProps: (item) => ({ label: item?.platform || 'Social link' }),
            },
            fields: [
              {
                type: 'string',
                name: 'platform',
                label: 'Platform',
                options: ['facebook', 'instagram', 'linkedin', 'twitter'],
              },
              { type: 'string', name: 'url', label: 'URL' },
            ],
          },
          {
            type: 'string',
            name: 'disclaimer',
            label: 'Footer disclaimer',
            ui: { component: 'textarea' },
          },
          { type: 'string', name: 'copyright', label: 'Footer copyright line' },
        ],
      },
    ],
  },
});
