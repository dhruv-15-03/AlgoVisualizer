import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { KeyboardHelp } from '@/components/workspace/KeyboardHelp';

/**
 * Fire a keydown that bubbles to the window listener. `fireEvent` wraps the
 * dispatch in `act()`, so the resulting React state update is flushed before we
 * assert (a raw `dispatchEvent` would not be).
 */
function press(key: string, init: Record<string, unknown> = {}, target: Element = document.body) {
  fireEvent.keyDown(target, { key, ...init });
}

describe('KeyboardHelp', () => {
  it('renders the trigger button and no dialog initially', () => {
    render(<KeyboardHelp />);
    expect(screen.getByRole('button', { name: /keyboard shortcuts/i })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens the dialog when the trigger is clicked', () => {
    render(<KeyboardHelp />);
    fireEvent.click(screen.getByRole('button', { name: /keyboard shortcuts/i }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    // Sourced from the keymap catalog → the transport shortcuts are listed.
    expect(screen.getByText('Play / pause')).toBeInTheDocument();
    expect(screen.getByText('Step back one frame')).toBeInTheDocument();
    expect(screen.getByText('Reset / replay')).toBeInTheDocument();
  });

  it('opens the dialog when "?" is pressed', () => {
    render(<KeyboardHelp />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    press('?');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('does NOT open on "?" while typing in an input', () => {
    render(<KeyboardHelp />);
    const input = document.createElement('input');
    document.body.appendChild(input);
    press('?', {}, input);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    document.body.removeChild(input);
  });

  it('does NOT open on "?" when Ctrl/Cmd/Alt is held', () => {
    render(<KeyboardHelp />);
    press('?', { ctrlKey: true });
    press('?', { metaKey: true });
    press('?', { altKey: true });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes the dialog via the Close button', () => {
    render(<KeyboardHelp />);
    press('?');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^close$/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('stops listening for "?" after unmount', () => {
    const { unmount } = render(<KeyboardHelp />);
    unmount();
    press('?');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
