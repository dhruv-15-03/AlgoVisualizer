import { describe, it, expect } from 'vitest';
import {
  resolvePlaybackAction,
  isEditableTarget,
  hasModifierKey,
  PLAYBACK_SHORTCUTS,
  type PlaybackKeyContext,
} from '@/lib/playback-keymap';

const ctx = (over: Partial<PlaybackKeyContext>): PlaybackKeyContext => ({
  key: over.key ?? '',
  isEditableTarget: over.isEditableTarget ?? false,
  hasModifier: over.hasModifier ?? false,
  canStepBack: over.canStepBack ?? true,
  canStepForward: over.canStepForward ?? true,
});

describe('playback-keymap.resolvePlaybackAction', () => {
  it('maps Space to play-pause', () => {
    expect(resolvePlaybackAction(ctx({ key: ' ' }))).toBe('play-pause');
    expect(resolvePlaybackAction(ctx({ key: 'Spacebar' }))).toBe('play-pause');
    expect(resolvePlaybackAction(ctx({ key: 'Space' }))).toBe('play-pause');
  });

  it('maps ArrowLeft to step-back when a previous frame exists', () => {
    expect(resolvePlaybackAction(ctx({ key: 'ArrowLeft', canStepBack: true }))).toBe('step-back');
  });

  it('blocks ArrowLeft at the first frame', () => {
    expect(resolvePlaybackAction(ctx({ key: 'ArrowLeft', canStepBack: false }))).toBeNull();
  });

  it('maps ArrowRight to step-forward when a next frame exists', () => {
    expect(resolvePlaybackAction(ctx({ key: 'ArrowRight', canStepForward: true }))).toBe(
      'step-forward',
    );
  });

  it('blocks ArrowRight at the last frame', () => {
    expect(resolvePlaybackAction(ctx({ key: 'ArrowRight', canStepForward: false }))).toBeNull();
  });

  it('maps Home to first-frame only when there is something earlier', () => {
    expect(resolvePlaybackAction(ctx({ key: 'Home', canStepBack: true }))).toBe('first-frame');
    expect(resolvePlaybackAction(ctx({ key: 'Home', canStepBack: false }))).toBeNull();
  });

  it('maps End to last-frame only when there is something later', () => {
    expect(resolvePlaybackAction(ctx({ key: 'End', canStepForward: true }))).toBe('last-frame');
    expect(resolvePlaybackAction(ctx({ key: 'End', canStepForward: false }))).toBeNull();
  });

  it('maps R (either case) to reset regardless of frame position', () => {
    expect(resolvePlaybackAction(ctx({ key: 'r' }))).toBe('reset');
    expect(resolvePlaybackAction(ctx({ key: 'R' }))).toBe('reset');
    expect(
      resolvePlaybackAction(ctx({ key: 'R', canStepBack: false, canStepForward: false })),
    ).toBe('reset');
  });

  it('returns null for unmapped keys', () => {
    for (const key of ['a', 'Enter', 'Tab', 'Escape', 'ArrowUp', 'ArrowDown', '1']) {
      expect(resolvePlaybackAction(ctx({ key }))).toBeNull();
    }
  });

  it('GUARD: ignores every shortcut while typing in an editable target', () => {
    for (const key of [' ', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'r']) {
      expect(resolvePlaybackAction(ctx({ key, isEditableTarget: true }))).toBeNull();
    }
  });

  it('GUARD: ignores every shortcut when a modifier is held', () => {
    for (const key of [' ', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'r']) {
      expect(resolvePlaybackAction(ctx({ key, hasModifier: true }))).toBeNull();
    }
  });
});

describe('playback-keymap.isEditableTarget', () => {
  it('returns true for input, textarea and select', () => {
    expect(isEditableTarget(document.createElement('input'))).toBe(true);
    expect(isEditableTarget(document.createElement('textarea'))).toBe(true);
    expect(isEditableTarget(document.createElement('select'))).toBe(true);
  });

  it('returns true for contenteditable elements and their descendants', () => {
    const editable = document.createElement('div');
    editable.setAttribute('contenteditable', 'true');
    const child = document.createElement('span');
    editable.appendChild(child);
    document.body.appendChild(editable);
    expect(isEditableTarget(editable)).toBe(true);
    expect(isEditableTarget(child)).toBe(true);
    document.body.removeChild(editable);
  });

  it('returns true for elements inside a Monaco editor', () => {
    const monaco = document.createElement('div');
    monaco.className = 'monaco-editor';
    const inner = document.createElement('textarea');
    monaco.appendChild(inner);
    document.body.appendChild(monaco);
    expect(isEditableTarget(inner)).toBe(true);
    document.body.removeChild(monaco);
  });

  it('returns false for non-editable elements and null', () => {
    expect(isEditableTarget(document.createElement('button'))).toBe(false);
    expect(isEditableTarget(document.createElement('div'))).toBe(false);
    expect(isEditableTarget(null)).toBe(false);
  });
});

describe('playback-keymap.hasModifierKey', () => {
  it('detects ctrl, meta and alt', () => {
    expect(hasModifierKey({ ctrlKey: true, metaKey: false, altKey: false })).toBe(true);
    expect(hasModifierKey({ ctrlKey: false, metaKey: true, altKey: false })).toBe(true);
    expect(hasModifierKey({ ctrlKey: false, metaKey: false, altKey: true })).toBe(true);
  });

  it('is false when no modifier is held (Shift is allowed)', () => {
    expect(hasModifierKey({ ctrlKey: false, metaKey: false, altKey: false })).toBe(false);
  });
});

describe('playback-keymap.PLAYBACK_SHORTCUTS (help-vs-behaviour drift guard)', () => {
  it('documents every transport shortcut with a non-empty key cap and description', () => {
    expect(PLAYBACK_SHORTCUTS.length).toBeGreaterThan(0);
    for (const s of PLAYBACK_SHORTCUTS) {
      expect(s.keys.length).toBeGreaterThan(0);
      expect(s.keys.every((k) => k.trim().length > 0)).toBe(true);
      expect(s.description.trim().length).toBeGreaterThan(0);
    }
  });

  it('every documented shortcut still resolves to a real playback action', () => {
    // The visible help can never claim a shortcut the keymap no longer honours:
    // each catalog `eventKey` must resolve to a non-null action (frame guards
    // open so Home/End/arrows are live).
    for (const s of PLAYBACK_SHORTCUTS) {
      const action = resolvePlaybackAction(
        ctx({ key: s.eventKey, canStepBack: true, canStepForward: true }),
      );
      expect(action, `"${s.description}" (${s.eventKey}) should map to an action`).not.toBeNull();
    }
  });

  it('covers all six transport keys exactly once', () => {
    const keys = PLAYBACK_SHORTCUTS.map((s) => s.eventKey);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toEqual([' ', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'r']);
  });
});
