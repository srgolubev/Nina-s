import * as React from 'react';
import { wrapFieldsWithMeta } from 'tinacms';

// ⬇️ The deployed Cloudflare Worker URL (workers/generate-image/).
const WORKER_URL = 'https://thaven-image.srgolubev.workers.dev';

/**
 * Custom Tina field for the post "image" value. Renders a button that asks
 * the Worker to generate an on-brand image from the post's text, stores the
 * returned path in this field, and shows a preview. The image is used for
 * social posts (Facebook/Instagram), not on the website itself.
 */
export const GenerateImageButton = wrapFieldsWithMeta(({ input, form }: any) => {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [preview, setPreview] = React.useState('');

  const generate = async () => {
    setLoading(true);
    setError('');
    try {
      const v = form.getState().values || {};
      if (!v.title) {
        setError('Add a title first — it guides the image.');
        setLoading(false);
        return;
      }
      const res = await fetch(WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: v.title,
          excerpt: v.excerpt,
          body: v.body,
          slug: v.slug,
          category: v.category,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      if (data.error) throw new Error(data.detail || data.error);
      input.onChange(data.image);
      if (data.preview) setPreview(data.preview);
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  const src = preview || (input.value ? input.value : '');

  const SITE_BASE = 'https://tranquilhaven.coach';

  const download = () => {
    // Prefer the in-memory preview (data URL); fall back to the published
    // file once the post has been saved and the site rebuilt.
    const href =
      preview ||
      (input.value
        ? input.value.startsWith('http')
          ? input.value
          : SITE_BASE + input.value
        : '');
    if (!href) return;
    const v = form.getState().values || {};
    const name = (v.slug || 'post') + '.png';
    const a = document.createElement('a');
    a.href = href;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button
          type="button"
          onClick={generate}
          disabled={loading}
          style={{
            background: '#5C8795',
            color: '#fff',
            border: 0,
            borderRadius: 8,
            padding: '8px 16px',
            fontWeight: 600,
            cursor: loading ? 'default' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Generating…' : 'Generate image from post'}
        </button>
        {src && (
          <button
            type="button"
            onClick={download}
            style={{
              background: '#fff',
              border: '1px solid #5C8795',
              color: '#5C8795',
              borderRadius: 8,
              padding: '8px 14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Download image
          </button>
        )}
        {input.value && (
          <button
            type="button"
            onClick={() => {
              input.onChange('');
              setPreview('');
            }}
            style={{
              background: 'transparent',
              border: '1px solid #ccc',
              borderRadius: 8,
              padding: '8px 12px',
              cursor: 'pointer',
            }}
          >
            Clear
          </button>
        )}
      </div>

      {src && (
        <img
          src={src}
          alt="Generated preview"
          style={{ maxWidth: 260, borderRadius: 10, border: '1px solid #eee' }}
        />
      )}

      {input.value && (
        <div style={{ fontSize: 12, color: '#666' }}>
          Saved as <code>{input.value}</code> — appears after you Save and the
          site rebuilds (~2 min).
        </div>
      )}

      {error && (
        <div style={{ fontSize: 12, color: '#b00' }}>
          {error}
        </div>
      )}
    </div>
  );
});
