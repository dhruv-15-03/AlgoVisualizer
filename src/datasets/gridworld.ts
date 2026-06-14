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

/**
 * Cliff-walk: the bottom row between S and G is a line of traps (the "cliff").
 * Stepping onto any cliff cell ends the episode with −1, so the optimal policy
 * hugs the safe row above the cliff before dropping down onto the goal.
 */
export const cliffWalk = fromLayout(
  'cliff-walk',
  'Cliff walk 4×6',
  'A cliff-walking gridworld: a row of traps (T) separates the start from the goal along the bottom edge. Stepping onto the cliff ends the episode with −1, so the agent learns to detour over the safe row before reaching G (+1).',
  [
    '. . . . . .',
    '. . . . . .',
    '. . . . . .',
    'S T T T T G',
  ],
);

/**
 * A larger 6×6 maze with winding walls and a single trap — more states and a
 * longer corridor to the goal, so value/policy take more episodes to propagate
 * back from G to S.
 */
export const maze = fromLayout(
  'maze',
  'Maze 6×6',
  'A 6×6 maze of winding corridors with one trap (T). More states and a longer route to the goal mean value information takes more episodes to propagate back from G (+1) to the start.',
  [
    'S . . # . T',
    '# # . # . .',
    '. . . . . #',
    '. # # # . .',
    '. . . # # .',
    '# . . . . G',
  ],
);
