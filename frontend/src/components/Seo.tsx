import { Helmet } from 'react-helmet-async';
import { SITE_NAME, type PageMeta } from '../lib/seo';

/**
 * Global tags that never vary per page. Rendered once in the app layout.
 *
 * Deliberately renders NO <title> and NO description: on React 19,
 * react-helmet-async renders native elements and React hoists every one of
 * them into <head> without deduping, so a default <title> plus a page-level
 * <title> would leave TWO <title> tags in the DOM (and titleTemplate /
 * defaultTitle are ignored on React 19). Every route therefore renders
 * exactly one <PageSeo> with its complete tags.
 */
export function DefaultSeo() {
  return (
    <Helmet>
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary" />
    </Helmet>
  );
}

/**
 * Per-page tags — the ONLY <title> / description on the page. `meta` comes
 * from lib/seo.ts builders (detail pages) or static copy (list/static pages).
 * The " | AI Discovery" suffix is applied here since titleTemplate is a
 * no-op on React 19. og:url uses the current location so shared links
 * resolve to the canonical client route.
 */
export function PageSeo({ meta }: { meta: PageMeta }) {
  const fullTitle = `${meta.title} | ${SITE_NAME}`;
  const url = typeof window !== 'undefined' ? window.location.href : undefined;
  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={meta.description} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={meta.description} />
      {url !== undefined && <meta property="og:url" content={url} />}
      {meta.noindex && <meta name="robots" content="noindex" />}
    </Helmet>
  );
}
