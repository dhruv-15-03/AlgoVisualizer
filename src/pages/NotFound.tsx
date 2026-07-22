import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

/**
 * 404 page. Rendered for any unmatched route and for `/workspace/:algoId` when
 * the id isn't a real algorithm. Two things matter here beyond UX:
 *
 *   1. We must NOT silently redirect unknown URLs to `/`. Doing so turns every
 *      typo and dead inbound link into a "soft 404" (HTTP 200 + home content),
 *      which wastes crawl budget and can get junk URLs indexed as duplicates of
 *      the homepage. Rendering a real not-found page at the requested URL is the
 *      correct signal.
 *   2. This is a static/SPA host, so we can't emit a real 404 status code. The
 *      next-best crawler signal is a `noindex` robots meta, which Googlebot
 *      honors after it renders the page. We flip the site's existing robots
 *      meta to `noindex` on mount and restore its prior value on unmount, so
 *      client navigations to real pages aren't left noindexed.
 */
export function NotFound() {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = 'Page not found · AlgoVisualizer';

    // Flip the site's robots directive to `noindex` while this page is shown so
    // crawlers drop the bad URL, then restore it on unmount. `index.html` ships
    // a static `<meta name="robots" content="index, follow">`, so we must UPDATE
    // that existing tag rather than append a second one (conflicting robots
    // metas are ambiguous — some crawlers honor the first). If none exists (e.g.
    // in tests), create a temporary one and remove it on unmount.
    const existing = document.head.querySelector('meta[name="robots"]');
    const prevContent = existing?.getAttribute('content') ?? null;
    const robots = existing ?? document.createElement('meta');
    if (!existing) {
      robots.setAttribute('name', 'robots');
      document.head.appendChild(robots);
    }
    robots.setAttribute('content', 'noindex');

    return () => {
      document.title = prevTitle;
      if (prevContent === null) {
        robots.remove();
      } else {
        robots.setAttribute('content', prevContent);
      }
    };
  }, []);

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center overflow-y-auto bg-ink-900 px-4 py-12 text-center sm:px-6">
      <div className="mb-6 grid h-16 w-16 place-items-center rounded-2xl bg-accent-500/15 text-accent-300">
        <Icon name="error_outline" size={36} />
      </div>
      <p className="font-mono text-sm font-medium tracking-widest text-ink-500">404</p>
      <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink-50 sm:text-4xl">
        Page not found
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-300 sm:text-base">
        This URL does not match any page here. It may have moved, or the link may be wrong. Head
        back to the home page, or jump into a guided learning path.
      </p>
      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
        <Link to="/">
          <Button variant="primary" size="lg">
            <Icon name="arrow_back" size={18} />
            Back to home
          </Button>
        </Link>
        <Link to="/learn">
          <Button variant="secondary" size="lg">
            <Icon name="menu_book" size={18} />
            Browse learning paths
          </Button>
        </Link>
      </div>
    </div>
  );
}
