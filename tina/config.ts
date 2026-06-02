import { defineConfig } from 'tinacms';

// The branch TinaCMS reads/writes content on. In CI/hosting this is set
// automatically; locally it falls back to "main".
const branch =
  process.env.GITHUB_BRANCH ||
  process.env.VERCEL_GIT_COMMIT_REF ||
  process.env.CF_PAGES_BRANCH ||
  process.env.HEAD ||
  'main';

// Maps each page file to its public route, so the admin "view page" link works.
const ROUTES: Record<string, string> = {
  home: '/',
  about: '/about',
  coaching: '/coaching',
  credentials: '/credentials',
  insights: '/insights',
  resources: '/resources',
  'reflection-stories': '/reflection-stories',
  testimonials: '/testimonials',
  faq: '/faq',
  contact: '/contact',
  privacy: '/privacy',
};

// SEO block shared by every page.
const seoField = {
  type: 'object' as const,
  name: 'seo',
  label: 'Page info (SEO)',
  fields: [
    { type: 'string' as const, name: 'title', label: 'Browser tab title' },
    {
      type: 'string' as const,
      name: 'description',
      label: 'Search-engine description',
      ui: { component: 'textarea' as const },
    },
  ],
};

// Rich body content: a list of paragraphs, bulleted lists and links.
const blockTemplates = [
  {
    name: 'paragraph',
    label: 'Paragraph',
    fields: [
      {
        type: 'string' as const,
        name: 'text',
        label: 'Text',
        ui: { component: 'textarea' as const },
      },
    ],
  },
  {
    name: 'list',
    label: 'Bulleted list',
    fields: [{ type: 'string' as const, name: 'items', label: 'Items', list: true }],
  },
  {
    name: 'link',
    label: 'Link',
    fields: [
      { type: 'string' as const, name: 'label', label: 'Link text' },
      { type: 'string' as const, name: 'url', label: 'URL' },
    ],
  },
];

const bodyField = (name: string, label: string) => ({
  type: 'object' as const,
  name,
  label,
  list: true,
  templates: blockTemplates,
});

const titleFields = [
  { type: 'string' as const, name: 'title', label: 'Page title' },
  { type: 'string' as const, name: 'tagline', label: 'Tagline (small line above the title)' },
];

export default defineConfig({
  branch,
  // From https://app.tina.io. The Client ID is a public project identifier
  // (it ships inside the built /admin bundle either way). The token is a
  // secret and must come from the TINA_TOKEN environment variable / GitHub
  // Actions secret — never hard-code it.
  clientId: process.env.TINA_CLIENT_ID || 'b4e69da7-1f3f-4cc1-8c43-83e583207eb5',
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
          // All pages already exist — keep editors from creating or deleting
          // page files by mistake.
          allowedActions: { create: false, delete: false },
          router: ({ document }) => ROUTES[document._sys.filename] || undefined,
        },
        templates: [
          {
            name: 'home',
            label: 'Home',
            fields: [
              seoField,
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
                ui: { itemProps: (item) => ({ label: item?.title || 'Card' }) },
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
                  { type: 'string', name: 'body', label: 'Card text', ui: { component: 'textarea' } },
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
            name: 'about',
            label: 'About',
            fields: [
              seoField,
              ...titleFields,
              { type: 'string', name: 'lead', label: 'Lead line', ui: { component: 'textarea' } },
              bodyField('body', 'Body content'),
              { type: 'string', name: 'closing', label: 'Closing signature line' },
              { type: 'string', name: 'note', label: 'Disclaimer note', ui: { component: 'textarea' } },
              { type: 'string', name: 'ctaLabel', label: 'Button text' },
              { type: 'string', name: 'ctaHref', label: 'Button link' },
            ],
          },
          {
            name: 'coaching',
            label: 'Coaching',
            fields: [
              seoField,
              ...titleFields,
              { type: 'string', name: 'intro', label: 'Intro', ui: { component: 'textarea' } },
              { type: 'string', name: 'supportiveTitle', label: '"Supportive for" heading' },
              { type: 'string', name: 'supportive', label: '"Supportive for" items', list: true },
              { type: 'string', name: 'formatTitle', label: 'Session format heading' },
              { type: 'string', name: 'format', label: 'Session format items', list: true },
              { type: 'string', name: 'packagesTitle', label: 'Packages heading' },
              {
                type: 'string',
                name: 'packagesIntro',
                label: 'Packages intro',
                ui: { component: 'textarea' },
              },
              {
                type: 'object',
                name: 'packages',
                label: 'Packages',
                list: true,
                ui: { itemProps: (item) => ({ label: item?.name || 'Package' }) },
                fields: [
                  { type: 'string', name: 'name', label: 'Package name' },
                  { type: 'string', name: 'sessionsLabel', label: 'Sessions label (e.g. "4 sessions")' },
                  { type: 'string', name: 'price', label: 'Price' },
                  { type: 'string', name: 'tagline', label: 'One-line tagline', ui: { component: 'textarea' } },
                  { type: 'string', name: 'description', label: 'Description', ui: { component: 'textarea' } },
                  { type: 'string', name: 'ctaLabel', label: 'Button text' },
                  { type: 'string', name: 'ctaHref', label: 'Booking link (Calendly / calendar URL)' },
                ],
              },
              { type: 'string', name: 'noticeTitle', label: 'Important notice heading' },
              { type: 'string', name: 'notice', label: 'Important notice', ui: { component: 'textarea' } },
            ],
          },
          {
            name: 'credentials',
            label: 'Credentials',
            fields: [
              seoField,
              ...titleFields,
              { type: 'string', name: 'intro', label: 'Intro', ui: { component: 'textarea' } },
              { type: 'string', name: 'items', label: 'Credentials list', list: true },
              { type: 'string', name: 'note', label: 'Disclaimer note', ui: { component: 'textarea' } },
            ],
          },
          {
            name: 'insights',
            label: 'Insights',
            fields: [
              seoField,
              ...titleFields,
              { type: 'string', name: 'intro', label: 'Intro', ui: { component: 'textarea' } },
            ],
          },
          {
            name: 'resources',
            label: 'Resources',
            fields: [
              seoField,
              ...titleFields,
              { type: 'string', name: 'intro', label: 'Intro', ui: { component: 'textarea' } },
            ],
          },
          {
            // Tina template names must be alphanumeric/underscore only, so
            // this template is reflection_stories and the JSON file carries
            // "_template": "reflection_stories" to match.
            name: 'reflection_stories',
            label: 'Reflection Stories',
            fields: [
              seoField,
              ...titleFields,
              { type: 'string', name: 'intro', label: 'Intro', ui: { component: 'textarea' } },
            ],
          },
          {
            name: 'testimonials',
            label: 'Testimonials',
            fields: [
              seoField,
              ...titleFields,
              { type: 'string', name: 'intro', label: 'Intro', ui: { component: 'textarea' } },
              {
                type: 'object',
                name: 'quotes',
                label: 'Quotes',
                list: true,
                ui: { itemProps: (item) => ({ label: item?.author || 'Quote' }) },
                fields: [
                  { type: 'string', name: 'quote', label: 'Quote', ui: { component: 'textarea' } },
                  { type: 'string', name: 'author', label: 'Author' },
                ],
              },
              { type: 'string', name: 'note', label: 'Disclaimer note', ui: { component: 'textarea' } },
              { type: 'string', name: 'ctaLabel', label: 'Button text' },
              { type: 'string', name: 'ctaHref', label: 'Button link' },
            ],
          },
          {
            name: 'faq',
            label: 'FAQ',
            fields: [
              seoField,
              ...titleFields,
              { type: 'string', name: 'intro', label: 'Intro', ui: { component: 'textarea' } },
              {
                // nameOverride keeps the JSON key as "items" while giving the
                // GraphQL field a unique name. Without this it collides with
                // the string-list "items" field on the Credentials template
                // (Tina/GraphQL forbids one field name with two types in a
                // collection).
                type: 'object',
                name: 'faqItems',
                nameOverride: 'items',
                label: 'Questions',
                list: true,
                ui: { itemProps: (item) => ({ label: item?.question || 'Question' }) },
                fields: [
                  { type: 'string', name: 'question', label: 'Question' },
                  bodyField('answer', 'Answer'),
                ],
              },
            ],
          },
          {
            name: 'contact',
            label: 'Contact',
            fields: [
              seoField,
              ...titleFields,
              { type: 'string', name: 'lead', label: 'Lead line', ui: { component: 'textarea' } },
              {
                type: 'object',
                name: 'channels',
                label: 'Contact channels (Email, Instagram, …)',
                list: true,
                ui: {
                  itemProps: (item) => ({ label: item?.label || 'Channel' }),
                },
                fields: [
                  {
                    type: 'string',
                    name: 'type',
                    label: 'Type (chooses the icon)',
                    options: ['email', 'instagram', 'facebook', 'messenger', 'link'],
                  },
                  { type: 'string', name: 'label', label: 'Display label' },
                  { type: 'string', name: 'value', label: 'Shown value (handle, address, etc.)' },
                  { type: 'string', name: 'url', label: 'Link URL (mailto: or https://)' },
                ],
              },
              { type: 'string', name: 'formTitle', label: 'Form heading' },
              { type: 'string', name: 'formText', label: 'Form text', ui: { component: 'textarea' } },
              {
                type: 'string',
                name: 'formEndpoint',
                label: 'Form endpoint URL (Formspree — leave empty to hide the form)',
              },
              {
                type: 'string',
                name: 'privacyNote',
                label: 'Privacy note',
                ui: { component: 'textarea' },
              },
            ],
          },
          {
            name: 'privacy',
            label: 'Privacy Policy',
            fields: [
              seoField,
              ...titleFields,
              { type: 'string', name: 'intro', label: 'Intro', ui: { component: 'textarea' } },
              {
                type: 'object',
                name: 'sections',
                label: 'Sections',
                list: true,
                ui: { itemProps: (item) => ({ label: item?.heading || 'Section' }) },
                fields: [
                  { type: 'string', name: 'heading', label: 'Heading' },
                  bodyField('body', 'Section content'),
                ],
              },
            ],
          },
        ],
      },
      {
        name: 'post',
        label: 'Blog posts (Inner Compass)',
        path: 'content/posts',
        format: 'json',
        ui: {
          allowedActions: { create: true, delete: true },
          filename: {
            slugify: (values) => {
              const cat = (values.category || 'post').toString();
              const raw = (values.slug || values.title || 'new-post').toString();
              const slug = raw
                .toLowerCase()
                .replace(/['’"]/g, '')
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '');
              return `${cat}-${slug || 'untitled'}`;
            },
          },
          itemProps: (item) => ({
            label: `[${item?.category || '?'}] ${item?.title || 'Untitled'}`,
          }),
        },
        defaultItem: () => ({
          category: 'insights',
          publishedAt: new Date().toISOString(),
          draft: false,
          body: [{ _template: 'paragraph', text: '' }],
        }),
        fields: [
          {
            type: 'string',
            name: 'category',
            label: 'Category',
            required: true,
            options: [
              { value: 'insights', label: 'Insights' },
              { value: 'resources', label: 'Resources' },
              { value: 'reflection-stories', label: 'Reflection Stories' },
            ],
          },
          { type: 'string', name: 'title', label: 'Title', required: true },
          {
            type: 'string',
            name: 'slug',
            label: 'URL slug (used in the link, e.g. /insights#<slug>)',
            required: true,
          },
          {
            type: 'datetime',
            name: 'publishedAt',
            label: 'Publish date (newest shown first)',
            required: true,
          },
          {
            type: 'boolean',
            name: 'draft',
            label: 'Draft (hide from the live site)',
          },
          {
            type: 'string',
            name: 'excerpt',
            label: 'Excerpt (shown on the index card)',
            ui: { component: 'textarea' },
          },
          bodyField('body', 'Post content'),
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
              {
                type: 'string',
                name: 'href',
                label: 'Link (leave empty if this is a dropdown group)',
              },
              {
                type: 'object',
                name: 'children',
                label: 'Dropdown items (optional)',
                list: true,
                ui: {
                  itemProps: (item) => ({ label: item?.label || 'Submenu item' }),
                },
                fields: [
                  { type: 'string', name: 'label', label: 'Label' },
                  { type: 'string', name: 'href', label: 'Link' },
                ],
              },
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
            type: 'object',
            name: 'footerLinks',
            label: 'Footer links',
            list: true,
            ui: {
              itemProps: (item) => ({ label: item?.label || 'Footer link' }),
            },
            fields: [
              { type: 'string', name: 'label', label: 'Label' },
              { type: 'string', name: 'href', label: 'Link' },
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
