import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Control the mocked PWA hook per-test. `vi.hoisted` runs before the
// `vi.mock` factory (which is itself hoisted above imports), so the factory can
// safely read these values when the component renders.
const mocks = vi.hoisted(() => ({
  needRefresh: false,
  offlineReady: false,
  updateServiceWorker: vi.fn(),
  setNeedRefresh: vi.fn(),
  setOfflineReady: vi.fn(),
}));

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [mocks.needRefresh, mocks.setNeedRefresh],
    offlineReady: [mocks.offlineReady, mocks.setOfflineReady],
    updateServiceWorker: mocks.updateServiceWorker,
  }),
}));

import { UpdatePrompt } from '@/components/UpdatePrompt';

describe('UpdatePrompt', () => {
  beforeEach(() => {
    mocks.needRefresh = false;
    mocks.offlineReady = false;
    mocks.updateServiceWorker.mockReset();
    mocks.setNeedRefresh.mockReset();
    mocks.setOfflineReady.mockReset();
  });

  it('renders nothing when there is no waiting update and not offline-ready', () => {
    const { container } = render(<UpdatePrompt />);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole('button', { name: /reload/i })).not.toBeInTheDocument();
  });

  it('shows the update toast with a Reload button when an update is waiting', () => {
    mocks.needRefresh = true;
    render(<UpdatePrompt />);
    expect(screen.getByText(/a new version is available/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reload/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /dismiss/i })).toBeInTheDocument();
  });

  it('triggers the service-worker update (with reload) when Reload is clicked', () => {
    mocks.needRefresh = true;
    render(<UpdatePrompt />);
    fireEvent.click(screen.getByRole('button', { name: /reload/i }));
    expect(mocks.updateServiceWorker).toHaveBeenCalledTimes(1);
    expect(mocks.updateServiceWorker).toHaveBeenCalledWith(true);
  });

  it('dismisses the update toast without reloading when Dismiss is clicked', () => {
    mocks.needRefresh = true;
    render(<UpdatePrompt />);
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(mocks.setNeedRefresh).toHaveBeenCalledWith(false);
    expect(mocks.updateServiceWorker).not.toHaveBeenCalled();
  });

  it('shows a polite "ready to work offline" status when offline-ready', () => {
    mocks.offlineReady = true;
    render(<UpdatePrompt />);
    expect(screen.getByText(/ready to work offline/i)).toBeInTheDocument();
    // The offline confirmation is informational — no action buttons.
    expect(screen.queryByRole('button', { name: /reload/i })).not.toBeInTheDocument();
  });
});
