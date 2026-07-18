import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NotFound } from '@/pages/NotFound';

function renderNotFound() {
  return render(
    <MemoryRouter>
      <NotFound />
    </MemoryRouter>,
  );
}

describe('NotFound', () => {
  afterEach(() => {
    cleanup();
    // Guard against leaking the robots meta between tests.
    document.head.querySelectorAll('meta[name="robots"]').forEach((m) => m.remove());
  });

  it('renders the 404 heading and code', () => {
    renderNotFound();
    expect(screen.getByRole('heading', { name: /page not found/i })).toBeInTheDocument();
    expect(screen.getByText('404')).toBeInTheDocument();
  });

  it('links back to home and to the learning paths', () => {
    renderNotFound();
    expect(screen.getByRole('link', { name: /back to home/i })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: /browse learning paths/i })).toHaveAttribute(
      'href',
      '/learn',
    );
  });

  it('sets a not-found document title and restores it on unmount', () => {
    document.title = 'Original Title';
    const { unmount } = renderNotFound();
    expect(document.title).toBe('Page not found · AlgoVisualizer');
    unmount();
    expect(document.title).toBe('Original Title');
  });

  it('adds a noindex robots meta on mount and removes it on unmount', () => {
    const { unmount } = renderNotFound();
    const meta = document.head.querySelector('meta[name="robots"]');
    expect(meta).not.toBeNull();
    expect(meta).toHaveAttribute('content', 'noindex');
    unmount();
    expect(document.head.querySelector('meta[name="robots"]')).toBeNull();
  });

  it('flips an existing robots meta to noindex without duplicating it, then restores it', () => {
    // index.html ships a static <meta name="robots" content="index, follow">.
    const existing = document.createElement('meta');
    existing.setAttribute('name', 'robots');
    existing.setAttribute('content', 'index, follow');
    document.head.appendChild(existing);

    const { unmount } = renderNotFound();
    const metas = document.head.querySelectorAll('meta[name="robots"]');
    expect(metas).toHaveLength(1);
    expect(metas[0]).toHaveAttribute('content', 'noindex');

    unmount();
    const after = document.head.querySelectorAll('meta[name="robots"]');
    expect(after).toHaveLength(1);
    expect(after[0]).toHaveAttribute('content', 'index, follow');
    existing.remove();
  });
});
