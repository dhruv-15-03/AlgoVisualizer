import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ModalPortal } from '@/components/ui/ModalPortal';

describe('ModalPortal', () => {
  it('renders children into document.body, escaping the local container', () => {
    const { container } = render(
      <div data-testid="anchor">
        <ModalPortal>
          <div data-testid="portaled">content</div>
        </ModalPortal>
      </div>,
    );

    const portaled = screen.getByTestId('portaled');
    expect(portaled).toBeInTheDocument();
    // It did NOT mount inside the local React container...
    expect(container.querySelector('[data-testid="portaled"]')).toBeNull();
    // ...it mounted on <body> instead, so a `fixed inset-0` overlay inside it
    // resolves to the viewport rather than any transformed/blurred ancestor.
    expect(document.body.contains(portaled)).toBe(true);
  });

  it('unmounts the portaled content with its parent tree', () => {
    const { unmount } = render(
      <ModalPortal>
        <div data-testid="portaled">content</div>
      </ModalPortal>,
    );
    expect(screen.getByTestId('portaled')).toBeInTheDocument();
    unmount();
    expect(screen.queryByTestId('portaled')).not.toBeInTheDocument();
  });
});
