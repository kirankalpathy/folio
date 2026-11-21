/** Central fuzzy-search similarity threshold (0-1). 0.8 = 80% similarity tolerance. */
export const FUZZY_MATCH_THRESHOLD = 0.8;

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  const curr = new Array<number>(b.length + 1);
  for (let i = 1; i <= a.length; i += 1) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1]! + 1, prev[j]! + 1, prev[j - 1]! + cost);
    }
    for (let j = 0; j <= b.length; j += 1) prev[j] = curr[j]!;
  }
  return prev[b.length]!;
}

function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

/** Returns 0 for no match, 1 for fuzzy, 2 for all tokens contained, 3 for full query contained. */
export function matchScore(query: string, text: string, threshold = FUZZY_MATCH_THRESHOLD): number {
  const q = query.toLowerCase().trim();
  const t = text.toLowerCase();
  if (!q) return 0;
  if (t.includes(q)) return 3;

  const queryTokens = q.split(/\s+/).filter(Boolean);
  const textTokens = t.split(/[\s·,/_-]+/).filter(Boolean);

  let allTokensContained = true;
  let allTokensFuzzy = true;

  for (const qt of queryTokens) {
    if (t.includes(qt)) continue;
    allTokensContained = false;
    const fuzzyToken = textTokens.some((tt) => {
      if (tt.includes(qt) || qt.includes(tt)) return true;
      if (similarity(qt, tt) >= threshold) return true;
      if (tt.length > qt.length) {
        for (let i = 0; i <= tt.length - qt.length; i += 1) {
          if (similarity(qt, tt.slice(i, i + qt.length)) >= threshold) return true;
        }
      }
      return false;
    });
    if (!fuzzyToken) {
      allTokensFuzzy = false;
      break;
    }
  }

  if (allTokensContained) return 2;
  if (allTokensFuzzy) return 1;
  return 0;
}

export function fuzzyMatch(query: string, text: string, threshold = FUZZY_MATCH_THRESHOLD): boolean {
  return matchScore(query, text, threshold) > 0;
}
