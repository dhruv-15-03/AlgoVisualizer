import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { usePlaybackKeyboard } from '@/hooks/usePlaybackKeyboard';
import { useSessionStore } from '@/stores/session-store';
import type { TraceEvent } from '@/types/trace';

function ev(e: { type: TraceEvent['type'] } & Record<string, unknown>): TraceEvent {
  return { step: 0, explanation: '', math: '', ...e } as TraceEvent;
}

const EVENTS: TraceEvent[] = [
  ev({ type: 'kmeans:init', centroids: [[0, 0]] }),
  ev({ type: 'kmeans:assign', labels: [0], inertia: 1 }),
  ev({ type: 'kmeans:update', centroids: [[0, 0]], moved: 1, inertia: 0.5 }),
];

function Harness() {
  usePlaybackKeyboard();
  return null;
}

function press(key: string, init: Partial<KeyboardEventInit> = {}, target?: EventTarget) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
  if (target) {
    target.dispatchEvent(event);
  } else {
    window.dispatchEvent(event);
  }
  return event;
}

describe('usePlaybackKeyboard', () => {
  beforeEach(() => {
    useSessionStore.setState({ events: EVENTS, currentStep: 1, playing: false });
  });
  afterEach(() => {
    cleanup();
    useSessionStore.setState({ events: [], currentStep: 0, playing: false });
  });

  it('Space toggles play', () => {
    render(<Harness />);
    expect(useSessionStore.getState().playing).toBe(false);
    press(' ');
    expect(useSessionStore.getState().playing).toBe(true);
  });

  it('ArrowRight steps forward, ArrowLeft steps back', () => {
    render(<Harness />);
    press('ArrowRight');
    expect(useSessionStore.getState().currentStep).toBe(2);
    press('ArrowLeft');
    expect(useSessionStore.getState().currentStep).toBe(1);
  });

  it('Home/End jump to first/last frame', () => {
    render(<Harness />);
    press('End');
    expect(useSessionStore.getState().currentStep).toBe(2);
    press('Home');
    expect(useSessionStore.getState().currentStep).toBe(0);
  });

  it('R resets playback to the first frame', () => {
    useSessionStore.setState({ currentStep: 2, playing: true });
    render(<Harness />);
    press('r');
    expect(useSessionStore.getState().currentStep).toBe(0);
    expect(useSessionStore.getState().playing).toBe(false);
  });

  it('ignores shortcuts when typing in an input', () => {
    render(<Harness />);
    const input = document.createElement('input');
    document.body.appendChild(input);
    press('ArrowRight', {}, input);
    expect(useSessionStore.getState().currentStep).toBe(1);
    document.body.removeChild(input);
  });

  it('ignores shortcuts when a modifier is held', () => {
    render(<Harness />);
    press('ArrowRight', { ctrlKey: true });
    expect(useSessionStore.getState().currentStep).toBe(1);
  });

  it('removes its listener on unmount', () => {
    const { unmount } = render(<Harness />);
    unmount();
    press('ArrowRight');
    expect(useSessionStore.getState().currentStep).toBe(1);
  });
});
