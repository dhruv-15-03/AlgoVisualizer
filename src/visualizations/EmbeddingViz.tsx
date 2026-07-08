/**
 * EmbeddingViz — three small side-by-side heatmaps for the "embedding" stage:
 * raw token embeddings, the sinusoidal positional-encoding matrix, and their
 * sum (what Q/K/V actually get projected from). Each is an n × d_model grid
 * (rows = tokens, columns = embedding dimensions) — deliberately NOT the same
 * component as `AttentionViz` because these matrices aren't square and their
 * columns are dimensions, not tokens.
 */
import { useMemo } from 'react';
import * as d3 from 'd3';

interface EmbeddingVizProps {
  tokens: string[];
  tokenEmbeddings: number[][] | null;
  positionalEncoding: number[][] | null;
  positionedEmbeddings: number[][] | null;
  usePosEnc: boolean;
}

const CELL_W = 20;
const CELL_H = 24;

function Grid({
  title,
  matrix,
  tokens,
  domain,
}: {
  title: string;
  matrix: number[][];
  tokens: string[];
  domain: [number, number];
}) {
  const colorScale = useMemo(() => d3.scaleSequential(d3.interpolateViridis).domain(domain), [domain]);
  const dModel = matrix[0]?.length ?? 0;
  const width = dModel * CELL_W;
  const height = matrix.length * CELL_H;
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-ink-300">{title}</span>
      <svg width={width + 60} height={height + 4}>
        <g transform="translate(56,2)">
          {matrix.map((row, i) => (
            <g key={`row-${i}`}>
              <text x={-6} y={i * CELL_H + CELL_H / 2 + 4} textAnchor="end" fontSize={10} fill="#94a3b8">
                {tokens[i]}
              </text>
              {row.map((v, j) => (
                <rect
                  key={`c-${i}-${j}`}
                  x={j * CELL_W}
                  y={i * CELL_H}
                  width={CELL_W - 1.5}
                  height={CELL_H - 1.5}
                  rx={1}
                  fill={colorScale(v)}
                >
                  <title>
                    {tokens[i]}, dim {j}: {v.toFixed(3)}
                  </title>
                </rect>
              ))}
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}

export function EmbeddingViz({
  tokens,
  tokenEmbeddings,
  positionalEncoding,
  positionedEmbeddings,
  usePosEnc,
}: EmbeddingVizProps) {
  const allValues = useMemo(() => {
    const mats = [tokenEmbeddings, positionalEncoding, positionedEmbeddings].filter(
      (m): m is number[][] => m !== null,
    );
    return mats.flatMap((m) => m.flat());
  }, [tokenEmbeddings, positionalEncoding, positionedEmbeddings]);

  if (!tokenEmbeddings || !positionalEncoding || !positionedEmbeddings || tokens.length === 0) {
    return (
      <div className="grid h-full place-items-center text-xs text-ink-400">
        Type a sentence and press Run to see the token + positional embeddings.
      </div>
    );
  }

  const domain: [number, number] = [d3.min(allValues) ?? -1, d3.max(allValues) ?? 1];

  return (
    <div className="flex h-full w-full flex-col items-start gap-4 overflow-auto p-3">
      <div className="flex flex-wrap gap-6">
        <Grid title="Token embedding (X)" matrix={tokenEmbeddings} tokens={tokens} domain={domain} />
        <Grid title="Positional encoding (PE)" matrix={positionalEncoding} tokens={tokens} domain={domain} />
        <Grid
          title={usePosEnc ? 'X + PE (used for Q/K/V)' : 'X + PE (computed, not used — toggle off)'}
          matrix={positionedEmbeddings}
          tokens={tokens}
          domain={domain}
        />
      </div>
      {!usePosEnc && (
        <p className="max-w-lg text-[11px] text-ink-500">
          Positional encoding is toggled off, so Q/K/V are projected straight from the raw token embedding (left) —
          identical words get identical rows no matter where they appear in the sentence.
        </p>
      )}
    </div>
  );
}
