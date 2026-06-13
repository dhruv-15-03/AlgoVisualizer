import { useEffect } from 'react';
import { useSessionStore } from '@/stores/session-store';
import {
  resolvePlaybackAction,
  isEditableTarget,
  hasModifierKey,
} from '@/lib/playback-keymap';

/**
 * usePlaybackKeyboard — keyboard transport for the workspace.
 *
 * Attaches a single `keydown` listener while the workspace is mounted and
 * translates resolved {@link resolvePlaybackAction} results into the EXACT same
 * session-store actions the on-screen transport buttons call — no forked
 * playback logic. Live store state is read via `getState()` inside the handler
 * so the effect can attach once (no stale closures, no re-subscription churn).
 *
 * Shortcuts (see playback-keymap): Space play/pause · ←/→ step · Home/End
 * first/last frame · R reset. Ignored while typing or when a modifier is held.
 */
export function usePlaybackKeyboard(): void {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const state = useSessionStore.getState();
      const { events, currentStep } = state;
      const action = resolvePlaybackAction({
        key: e.key,
        isEditableTarget: isEditableTarget(e.target),
        hasModifier: hasModifierKey(e),
        canStepBack: currentStep > 0,
        canStepForward: currentStep < events.length - 1,
      });
      if (!action) return;

      // There must be a trace to control before we swallow the key — except
      // play/pause, which is harmless to invoke (the store no-ops on empty).
      if (events.length === 0 && action !== 'play-pause') return;

      // Stop the page from scrolling on Space/Arrows/Home/End once we've
      // claimed the key for playback.
      e.preventDefault();

      switch (action) {
        case 'play-pause':
          state.togglePlay();
          break;
        case 'step-back':
          state.stepBack();
          break;
        case 'step-forward':
          state.stepForward();
          break;
        case 'first-frame':
          state.seekTo(0);
          break;
        case 'last-frame':
          state.seekTo(events.length - 1);
          break;
        case 'reset':
          state.resetPlayback();
          break;
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
