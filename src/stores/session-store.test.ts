import { describe, it, expect, beforeEach } from 'vitest';
import { useSessionStore } from '@/stores/session-store';
import type { AlgorithmHyperparam } from '@/types/algorithm';
import type { TraceEvent } from '@/types/trace';

function resetStore() {
  useSessionStore.setState({
    pyodideStatus: 'idle',
    pyodideProgress: '',
    algorithmId: null,
    datasetId: null,
    code: '',
    hyperparams: {},
    events: [],
    runStatus: 'idle',
    runError: null,
    runToken: 0,
    currentStep: 0,
    playing: false,
    speed: 2,
    quizMode: false,
  });
}

function makeEvent(step: number): TraceEvent {
  return { type: 'finished', step, explanation: '', math: '', totalSteps: step };
}

beforeEach(resetStore);

describe('session-store · setAlgorithm', () => {
  const hyperparams: AlgorithmHyperparam[] = [
    { id: 'k', label: 'k', codeKey: 'k=', type: 'int', min: 2, max: 8, default: 3 },
    { id: 'mode', label: 'Mode', codeKey: 'mode=', type: 'enum', options: ['a', 'b'], default: 'a' },
  ];

  it('loads code and seeds hyperparams from their defaults', () => {
    useSessionStore.getState().setAlgorithm('kmeans', { code: 'def run(): ...', hyperparams });
    const s = useSessionStore.getState();
    expect(s.algorithmId).toBe('kmeans');
    expect(s.code).toBe('def run(): ...');
    expect(s.hyperparams).toEqual({ k: 3, mode: 'a' });
  });

  it('resets playback and run state from a previous algorithm', () => {
    useSessionStore.setState({
      events: [makeEvent(0), makeEvent(1)],
      currentStep: 1,
      runStatus: 'error',
      runError: 'boom',
    });
    useSessionStore.getState().setAlgorithm('linreg', { code: 'x', hyperparams: [] });
    const s = useSessionStore.getState();
    expect(s.events).toEqual([]);
    expect(s.currentStep).toBe(0);
    expect(s.runStatus).toBe('idle');
    expect(s.runError).toBeNull();
    expect(s.hyperparams).toEqual({});
  });
});

describe('session-store · setDataset / setCode', () => {
  it('setDataset stores the dataset id', () => {
    useSessionStore.getState().setDataset('iris');
    expect(useSessionStore.getState().datasetId).toBe('iris');
  });

  it('setCode replaces the code', () => {
    useSessionStore.getState().setCode('print(1)');
    expect(useSessionStore.getState().code).toBe('print(1)');
  });
});

describe('session-store · setHyperparam', () => {
  beforeEach(() => {
    useSessionStore.setState({ hyperparams: { k: 3, max_iter: 20 } });
  });

  it('updates a single key and preserves the others', () => {
    useSessionStore.getState().setHyperparam('k', 5);
    expect(useSessionStore.getState().hyperparams).toEqual({ k: 5, max_iter: 20 });
  });

  it('supports string and boolean values', () => {
    useSessionStore.getState().setHyperparam('mode', 'fast');
    useSessionStore.getState().setHyperparam('warm', true);
    const hp = useSessionStore.getState().hyperparams;
    expect(hp.mode).toBe('fast');
    expect(hp.warm).toBe(true);
  });
});

describe('session-store · run lifecycle (token guarding)', () => {
  it('beginRun increments the token and enters the running state', () => {
    const token = useSessionStore.getState().beginRun();
    const s = useSessionStore.getState();
    expect(token).toBe(1);
    expect(s.runToken).toBe(1);
    expect(s.runStatus).toBe('running');
    expect(s.events).toEqual([]);
    expect(s.runError).toBeNull();
  });

  it('appendEvent accepts events from the current run and rejects stale ones', () => {
    const token = useSessionStore.getState().beginRun();
    useSessionStore.getState().appendEvent(makeEvent(0), token);
    useSessionStore.getState().appendEvent(makeEvent(1), token - 1); // stale → dropped
    expect(useSessionStore.getState().events).toHaveLength(1);
  });

  it('finishRun only applies for the matching token', () => {
    const token = useSessionStore.getState().beginRun();
    useSessionStore.getState().finishRun('error', 'kaboom', token - 1); // stale
    expect(useSessionStore.getState().runStatus).toBe('running');
    useSessionStore.getState().finishRun('success', null, token);
    expect(useSessionStore.getState().runStatus).toBe('success');
    expect(useSessionStore.getState().runError).toBeNull();
  });
});

describe('session-store · playback navigation', () => {
  beforeEach(() => {
    useSessionStore.setState({ events: [makeEvent(0), makeEvent(1), makeEvent(2)], currentStep: 0 });
  });

  it('stepForward advances but never past the last event', () => {
    const { stepForward } = useSessionStore.getState();
    stepForward();
    stepForward();
    stepForward(); // clamp
    expect(useSessionStore.getState().currentStep).toBe(2);
  });

  it('stepBack never goes below zero', () => {
    useSessionStore.setState({ currentStep: 1 });
    const { stepBack } = useSessionStore.getState();
    stepBack();
    stepBack(); // clamp
    expect(useSessionStore.getState().currentStep).toBe(0);
  });

  it('seekTo clamps to the valid range', () => {
    useSessionStore.getState().seekTo(99);
    expect(useSessionStore.getState().currentStep).toBe(2);
    useSessionStore.getState().seekTo(-5);
    expect(useSessionStore.getState().currentStep).toBe(0);
  });
});
