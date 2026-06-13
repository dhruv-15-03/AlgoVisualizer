import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { LiveAnnouncer } from '@/components/workspace/LiveAnnouncer';
import { useSessionStore } from '@/stores/session-store';
import type { TraceEvent } from '@/types/trace';

function ev(e: { type: TraceEvent['type'] } & Record<string, unknown>): TraceEvent {
  return { step: 0, explanation: '', math: '', ...e } as TraceEvent;
}

const EVENTS: TraceEvent[] = [
  ev({ type: 'kmeans:init', centroids: [[0, 0], [1, 1]] }),
  ev({ type: 'kmeans:assign', labels: [0, 1], inertia: 0.5 }),
  ev({ type: 'kmeans:update', centroids: [[0, 0]], moved: 1, inertia: 0.3 }),
];

describe('LiveAnnouncer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useSessionStore.setState({ events: [], currentStep: 0 });
  });
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    useSessionStore.setState({ events: [], currentStep: 0 });
  });

  it('renders a polite, atomic, visually-hidden status region', () => {
    render(<LiveAnnouncer />);
    const region = screen.getByRole('status');
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(region).toHaveAttribute('aria-atomic', 'true');
    expect(region).toHaveClass('sr-only');
  });

  it('announces the current step immediately (leading edge)', () => {
    render(<LiveAnnouncer />);
    act(() => {
      useSessionStore.setState({ events: EVENTS, currentStep: 0 });
    });
    expect(screen.getByRole('status')).toHaveTextContent('K-means: placed 2 initial centroids.');
  });

  it('throttles rapid changes but eventually announces the latest', () => {
    render(<LiveAnnouncer />);
    act(() => {
      useSessionStore.setState({ events: EVENTS, currentStep: 0 });
    });
    // Leading edge spoke step 0.
    expect(screen.getByRole('status')).toHaveTextContent('placed 2 initial centroids');

    // Two quick changes within the throttle window — only the latest should win.
    act(() => {
      useSessionStore.setState({ currentStep: 1 });
      useSessionStore.setState({ currentStep: 2 });
    });
    // Still showing the leading-edge message until the window elapses.
    expect(screen.getByRole('status')).toHaveTextContent('placed 2 initial centroids');

    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(screen.getByRole('status')).toHaveTextContent('moved 1 centroid. Inertia 0.3.');
  });

  it('does not change text for a no-op (empty events)', () => {
    render(<LiveAnnouncer />);
    act(() => {
      useSessionStore.setState({ events: [], currentStep: 0 });
    });
    expect(screen.getByRole('status')).toHaveTextContent('');
  });
});
