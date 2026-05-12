import { Helmet } from 'react-helmet-async';

const DEFAULTS = {
  title: 'KokoPass — Verified Samoan cacao',
  description:
    'Single-origin Samoan cacao, traceable from the farm that grew it to the bar that sells it.',
  image: '/og-image.svg'
};

/**
 * Inject per-page <title> + OG/Twitter meta. Helps crawlers that run
 * JS (Slack, LinkedIn, Twitter, Facebook). WhatsApp and other no-JS
 * crawlers fall back to the static defaults baked into index.html.
 */
export default function Seo({ title, description, image, url, kind = 'website' }) {
  const t = title ? `${title} · KokoPass` : DEFAULTS.title;
  const d = description || DEFAULTS.description;
  const img = absoluteUrl(image || DEFAULTS.image);
  const u =
    url ||
    (typeof window !== 'undefined' ? window.location.href : 'https://kokopass.web.app/');

  return (
    <Helmet prioritizeSeoTags>
      <title>{t}</title>
      <meta name="description" content={d} />
      <link rel="canonical" href={u} />

      <meta property="og:type" content={kind} />
      <meta property="og:title" content={t} />
      <meta property="og:description" content={d} />
      <meta property="og:url" content={u} />
      <meta property="og:image" content={img} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={t} />
      <meta name="twitter:description" content={d} />
      <meta name="twitter:image" content={img} />
    </Helmet>
  );
}

function absoluteUrl(path) {
  if (!path) return path;
  if (/^https?:\/\//.test(path)) return path;
  if (typeof window === 'undefined') return path;
  return `${window.location.origin}${path.startsWith('/') ? path : `/${path}`}`;
}
