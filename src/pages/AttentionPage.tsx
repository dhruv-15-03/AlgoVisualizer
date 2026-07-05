/**
 * AttentionPage — standalone "LLM / Modern AI Lab" experience.
 *
 * Deliberately NOT wired through the classic-ML workspace pipeline
 * (`useSessionStore` / `training-controller` / `AlgorithmMeta` / dataset
 * picker) because that pipeline assumes a numeric X/y dataset. Attention
 * operates on a free-text sentence, so this page talks to the Pyodide
 * worker directly (same `ensureWorker()` singleton, same event-streaming
 * contract) and keeps its own local playback state.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import * as Comlink from 'comlink';
import { BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';
import { Panel } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Slider } from '@/components/ui/Slider';
import { CodeEditor } from '@/components/CodeEditor';
import { ensureWorker } from '@/workers/pyodide.client';
import { tokenize, embedTokens } from '@/lib/toy-embeddings';
import { attentionSnapshot, STAGE_LABELS } from '@/visualizations/attention-snapshot';
import { AttentionViz } from '@/visualizations/AttentionViz';
import type { TraceEvent } from '@/types/trace';
import attentionPy from '@/algorithms/python/attention.py?raw';

type RunStatus = 'idle' | 'loading-py' | 'running' | 'done' | 'error';

export function AttentionPage() {
  const [sentence, setSentence] = useState('the cat sat on the mat');
  const [code, setCode] = useState(attentionPy);
  const [dModel, setDModel] = useState(8);
  const [dK, setDK] = useState(4);
  const [seed, setSeed] = useState(0);
  const [scale, setScale] = useState(true);
  const [causal, setCausal] = useState(false);
  const [showCode, setShowCode] = useState(false);

  const [events, setEvents] = useState<TraceEvent[]>([]);
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState<RunStatus>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const runToken = useRef(0);

  const tokens = useMemo(() => tokenize(sentence), [sentence]);

  const snapshot = useMemo(() => attentionSnapshot(events, step), [events, step]);

  const run = useCallback(async () => {
    const toks = tokenize(sentence);
    if (toks.length === 0) {
      setStatus('error');
      setStatusMessage('Type a sentence first.');
      return;
    }
    if (toks.length > 12) {
      setStatus('error');
      setStatusMessage('Keep it to 12 tokens or fewer so the heatmap stays readable.');
      return;
    }

    const token = ++runToken.current;
    setEvents([]);
    setStep(0);
    setStatus('loading-py');
    setStatusMessage('Starting Python…');

    const worker = ensureWorker();
    try {
      await worker.init(
        Comlink.proxy((p) => {
          if (token !== runToken.current) return;
          if (p.stage === 'error') {
            setStatus('error');
            setStatusMessage(p.message);
          } else {
            setStatusMessage(p.message);
          }
        }),
      );
    } catch (err) {
      if (token !== runToken.current) return;
      setStatus('error');
      setStatusMessage(err instanceof Error ? err.message : String(err));
      return;
    }

    if (token !== runToken.current) return;
    setStatus('running');
    setStatusMessage('Computing self-attention…');

    const X = embedTokens(toks, dModel, seed);
    const hyperparams = {
      tokens_json: JSON.stringify(toks),
      d_k: dK,
      seed,
      scale: scale ? 1 : 0,
      causal: causal ? 1 : 0,
    };

    const collected: TraceEvent[] = [];
    const onEvent = Comlink.proxy((raw: Record<string, unknown>) => {
      if (token !== runToken.current) return;
      const e = { ...raw } as Record<string, unknown>;
      if (typeof e.step !== 'number') e.step = collected.length;
      if (typeof e.explanation !== 'string') e.explanation = '';
      if (typeof e.math !== 'string') e.math = '';
      const event = e as unknown as TraceEvent;
      collected.push(event);
      setEvents([...collected]);
    });

    try {
      const result = await worker.run(code, X, null, hyperparams, onEvent);
      if (token !== runToken.current) return;
      if (result.status === 'error') {
        setStatus('error');
        setStatusMessage(result.message ?? 'Python error.');
      } else {
        setStatus('done');
        setStatusMessage(`Done — ${result.totalEvents} steps.`);
        setStep(collected.length - 1);
      }
    } catch (err) {
      if (token !== runToken.current) return;
      setStatus('error');
      setStatusMessage(err instanceof Error ? err.message : String(err));
    }
  }, [sentence, code, dModel, dK, seed, scale, causal]);

  // Auto-run once on mount so the page never opens on an empty state.
  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const maxStep = Math.max(0, events.length - 1);
  const isBusy = status === 'loading-py' || status === 'running';

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-ink-900">
      <header className="flex items-center justify-between gap-3 border-b border-ink-700 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-ink-400 hover:text-ink-200" aria-label="Back home">
            <Icon name="arrow_back" size={20} />
          </Link>
          <div>
            <h1 className="text-sm font-semibold text-ink-100">Self-Attention Lab</h1>
            <p className="text-[11px] text-ink-500">LLM / Modern AI · scaled dot-product attention</p>
          </div>
        </div>
        <span className="hidden rounded-full bg-accent-500/15 px-2.5 py-1 text-[11px] font-medium text-accent-300 sm:inline-block">
          <Icon name="science" size={12} className="mr-1 inline-block align-[-2px]" />
          New
        </span>
      </header>

      <div className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 gap-4 p-4 sm:p-6 lg:grid-cols-[360px_1fr]">
        <div className="flex flex-col gap-4">
          <Panel title="Sentence" subtitle="Type up to 12 tokens — this becomes the toy sequence.">
            <div className="flex flex-col gap-2">
              <textarea
                value={sentence}
                onChange={(e) => setSentence(e.target.value)}
                rows={2}
                className="w-full resize-none rounded-md border border-ink-700 bg-ink-900 px-3 py-2 font-mono text-sm text-ink-100 outline-none focus:border-accent-400"
                placeholder="the cat sat on the mat"
              />
              <div className="flex flex-wrap gap-1">
                {tokens.map((t, i) => (
                  <span
                    key={`${t}-${i}`}
                    className="rounded-md bg-ink-800 px-1.5 py-0.5 font-mono text-[10px] text-ink-300"
                  >
                    {t}
                  </span>
                ))}
              </div>
              <Button variant="primary" size="sm" onClick={() => void run()} disabled={isBusy}>
                <Icon name={isBusy ? 'hourglass_top' : 'play_arrow'} size={16} />
                {isBusy ? 'Running…' : 'Run attention'}
              </Button>
              {statusMessage && (
                <div className={`text-[11px] ${status === 'error' ? 'text-rose-300' : 'text-ink-500'}`}>
                  {statusMessage}
                </div>
              )}
            </div>
          </Panel>

          <Panel title="Parameters" subtitle="These stand in for a trained model's learned weights.">
            <div className="flex flex-col gap-3 text-xs text-ink-300">
              <label className="flex flex-col gap-1">
                <span className="flex justify-between">
                  <span>d_model (embedding size)</span>
                  <span className="font-mono text-ink-100">{dModel}</span>
                </span>
                <Slider value={dModel} min={4} max={16} step={1} onValueChange={setDModel} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="flex justify-between">
                  <span>d_k (Q/K/V projection size)</span>
                  <span className="font-mono text-ink-100">{dK}</span>
                </span>
                <Slider value={dK} min={1} max={dModel} step={1} onValueChange={setDK} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="flex justify-between">
                  <span>seed</span>
                  <span className="font-mono text-ink-100">{seed}</span>
                </span>
                <Slider value={seed} min={0} max={20} step={1} onValueChange={setSeed} />
              </label>
              <label className="flex items-center justify-between gap-2">
                <span>Scale by 1/√d_k</span>
                <input
                  type="checkbox"
                  checked={scale}
                  onChange={(e) => setScale(e.target.checked)}
                  className="h-4 w-4 accent-accent-400"
                />
              </label>
              <label className="flex items-center justify-between gap-2">
                <span>Causal mask (GPT-style)</span>
                <input
                  type="checkbox"
                  checked={causal}
                  onChange={(e) => setCausal(e.target.checked)}
                  className="h-4 w-4 accent-accent-400"
                />
              </label>
            </div>
          </Panel>

          <Panel
            title="Python"
            subtitle="Edit the attention mechanism itself."
            right={
              <button
                onClick={() => setShowCode((v) => !v)}
                className="text-[11px] text-accent-300 hover:text-accent-200"
              >
                {showCode ? 'Hide' : 'Show'}
              </button>
            }
          >
            {showCode ? (
              <div className="h-72 overflow-hidden rounded-md border border-ink-700">
                <CodeEditor value={code} onChange={setCode} />
              </div>
            ) : (
              <p className="text-[11px] text-ink-500">
                Click &ldquo;Show&rdquo; to open the editable Python — the exact scaled dot-product attention
                computation, runnable and hackable in your browser.
              </p>
            )}
          </Panel>
        </div>

        <div className="flex flex-col gap-4">
          <Panel
            title={STAGE_LABELS[snapshot.stage]}
            subtitle="Rows = queries, columns = keys. Hover a row to see what it attends to."
            className="min-h-[340px]"
          >
            <AttentionViz snapshot={snapshot} />
          </Panel>

          <Panel title="Step" noBody>
            <div className="flex items-center gap-3 px-3 py-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                disabled={step <= 0}
                aria-label="Previous step"
              >
                <Icon name="skip_previous" size={18} />
              </Button>
              <input
                type="range"
                min={0}
                max={maxStep}
                value={Math.min(step, maxStep)}
                onChange={(e) => setStep(Number(e.target.value))}
                className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-ink-700 accent-accent-400"
                disabled={maxStep === 0}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setStep((s) => Math.min(maxStep, s + 1))}
                disabled={step >= maxStep}
                aria-label="Next step"
              >
                <Icon name="skip_next" size={18} />
              </Button>
              <span className="w-14 text-right font-mono text-[11px] text-ink-500">
                {Math.min(step, maxStep) + (events.length ? 1 : 0)}/{events.length}
              </span>
            </div>
          </Panel>

          <Panel title="What's happening">
            <div className="flex flex-col gap-3 text-sm text-ink-200">
              <p>{snapshot.explanation || 'Run the mechanism to see a step-by-step explanation.'}</p>
              {snapshot.math && (
                <div className="overflow-x-auto rounded-md bg-ink-900 px-3 py-2">
                  <BlockMath math={snapshot.math} />
                </div>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
