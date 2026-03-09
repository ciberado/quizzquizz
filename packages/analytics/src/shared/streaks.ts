/**
 * Streak computation over boolean sequences.
 */

/** Compute the current and longest streak of consecutive `true` values. */
export function streaks(booleans: boolean[]): { current: number; longest: number } {
  if (booleans.length === 0) return { current: 0, longest: 0 };

  let longest = 0;
  let run = 0;

  for (const b of booleans) {
    if (b) {
      run++;
      if (run > longest) longest = run;
    } else {
      run = 0;
    }
  }

  // Count backwards from the end to get the current streak
  let current = 0;
  for (let i = booleans.length - 1; i >= 0; i--) {
    if (booleans[i]) {
      current++;
    } else {
      break;
    }
  }

  return { current, longest };
}
