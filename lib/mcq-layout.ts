/**
 * Splits an MCQ stem into three groups: stimulus, prompt, and statements.
 *
 * For MCQ items, the required render order is:
 * 1. stimulus lines (not statements, not prompt)
 * 2. question
 * 3. prompt line (matches /^নিচের.*\?$/)
 * 4. statement lines (match /^\(?(?:i|ii|iii|iv|v)[.)]\s/, i.e. "i. ", "i) " or "(i) ")
 * 5. options
 *
 * This helper extracts the three groups from the stem array so that
 * components can render them in the correct order.
 *
 * @param stem - The stem lines from an MCQ question
 * @returns Object with stimulus, prompt, and statements arrays
 */
export function splitMcqStem(stem: string[]): {
  stimulus: string[];
  prompt: string[];
  statements: string[];
} {
  const stimulus: string[] = [];
  const prompt: string[] = [];
  const statements: string[] = [];

  for (const line of stem) {
    // Check if this is a prompt line (e.g., "নিচের কোনটি সঠিক?")
    if (/^নিচের.*\?$/.test(line)) {
      prompt.push(line);
    }
    // Check if this is a statement line (e.g., "i. ", "i) ", "(i) ", etc.)
    else if (/^\(?(?:i|ii|iii|iv|v)[.)]\s/.test(line)) {
      statements.push(line);
    }
    // Otherwise, it's a stimulus line
    else {
      stimulus.push(line);
    }
  }

  return { stimulus, prompt, statements };
}
