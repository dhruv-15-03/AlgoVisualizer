import { type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Renders `children` into `<body>` via a portal.
 *
 * Modal overlays fill the screen with `position: fixed; inset: 0`. That only
 * resolves to the viewport when no ancestor establishes a containing block for
 * fixed descendants — but `transform`, `filter`, `backdrop-filter`,
 * `perspective`, `will-change`, and `contain` all do. The workspace header uses
 * `backdrop-blur` (a `backdrop-filter`), so a dialog rendered inline from a
 * header control is sized to the header strip instead of the page: it
 * mis-centers and the scrim dims only the header. Portaling to `<body>` escapes
 * every such ancestor, so an overlay always covers the true viewport no matter
 * where it is invoked from.
 */
export function ModalPortal({ children }: { children: ReactNode }) {
  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}
