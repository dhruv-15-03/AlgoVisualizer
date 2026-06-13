/**
 * GridWorld environments for the reinforcement-learning algorithms.
 *
 * RL has no feature matrix the way supervised learning does, so we model an
 * environment as a `Dataset` whose `X` is the H×W grid of integer cell codes
 * and whose `y` is null. Each RL algorithm's Python generator reads `X` back as
 * a grid, walks an agent through it, and learns a policy.
 *
 * Cell codes (shared with the Python side):
 *   0 empty · 1 wall · 2 goal (+1) · 3 trap (−1) · 4 start
 */

import type { Dataset } from '@/types/dataset';

const CODE: Record<string, number> = { '.': 0, '#': 1, G: 2, T: 3, S: 4 };

function fromLayout(id: string, name: string, description: string, rows: string[]): Dataset {
  const grid = rows.map((row) =>
    row
      .trim()
      .split(/\s+/)
      .map((cell) => {
        const code = CODE[cell];
        if (code === undefined) throw new Error(`gridworld "${id}": unknown cell "${cell}"`);
        return code;
      }),
  );
  const cols = grid[0]?.length ?? 0;
  if (grid.some((r) => r.length !== cols)) {
    throw new Error(`gridworld "${id}": all rows must have the same width`);
  }
  return {
    id,
    name,
    description,
    X: grid,
    y: null,
    featureNames: Array.from({ length: cols }, (_, i) => `col ${i}`),
    task: 'reinforcement',
    source: 'Synthetic gridworld',
  };
}

/** 5×5 gridworld with a couple of walls and one trap — the default RL env. */
export const gridworld = fromLayout(
  'gridworld',
  'GridWorld 5×5',
  'A 5×5 gridworld: the agent starts at S and must reach the goal (G, +1) while avoiding the trap (T, −1). Walls (#) block movement and each step costs a little, so the agent learns the shortest safe path.',
  [
    'S . . . T',
    '. # # . .',
    '. . . . .',
    '. # # # .',
    '. . . . G',
  ],
);

/** Compact 4×4 gridworld — fewer states, converges in fewer episodes. */
export const gridworldOpen = fromLayout(
  'gridworld-open',
  'GridWorld 4×4',
  'A compact 4×4 gridworld with fewer states, so policies converge in fewer episodes. Reach G (+1), avoid T (−1), and route around the walls (#).',
  [
    'S . . T',
    '. . # .',
    '. # . .',
    '. . . G',
  ],
);
