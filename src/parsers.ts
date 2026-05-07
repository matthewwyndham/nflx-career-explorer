// Ports of the Python parsers in netflix_careers.py. Keep regex semantics
// identical; the test cases the Python version implicitly relies on (years
// in parens like "Summer 2026" not matching as a level, salary sanity bounds,
// "USA - Remote" detection via location string) all need to keep passing.

const LEVEL_PAREN_RE = /\(([^)]*)\)/g;
const LEVEL_INNER_RE = /\bL?([3-7])\b/g;
const LEVEL_OUT_LX_RE = /\bL([3-7])\b/g;
const LEVEL_OUT_BARE_RE = /\b([3-7])(?:\s*\/\s*([3-7]))?\b(?=\s*[-–—,]|\s*$)/g;

export function parseLevels(title: string | undefined | null): number[] {
  if (!title) return [];
  const levels = new Set<number>();
  for (const m of title.matchAll(LEVEL_PAREN_RE)) {
    const inner = m[1] ?? '';
    for (const im of inner.matchAll(LEVEL_INNER_RE)) {
      levels.add(parseInt(im[1]!, 10));
    }
  }
  const noParens = title.replace(LEVEL_PAREN_RE, '');
  for (const m of noParens.matchAll(LEVEL_OUT_LX_RE)) {
    levels.add(parseInt(m[1]!, 10));
  }
  for (const m of noParens.matchAll(LEVEL_OUT_BARE_RE)) {
    levels.add(parseInt(m[1]!, 10));
    if (m[2]) levels.add(parseInt(m[2], 10));
  }
  return [...levels].sort((a, b) => a - b);
}

const SALARY_PRIMARY_RE = /range for this role is\s*\$([\d,]+(?:\.\d+)?)\s*[-–—]\s*\$([\d,]+(?:\.\d+)?)/i;
const SALARY_FALLBACK_RE = /\$([\d,]+(?:\.\d+)?)\s*[-–—]\s*\$([\d,]+(?:\.\d+)?)/;

export function parseSalary(descHtml: string | undefined | null): [number, number] | null {
  if (!descHtml) return null;
  const text = unescapeHtmlEntities(descHtml.replace(/<[^>]+>/g, ' '));
  const m = SALARY_PRIMARY_RE.exec(text) ?? SALARY_FALLBACK_RE.exec(text);
  if (!m) return null;
  const low = parseFloat(m[1]!.replace(/,/g, ''));
  const high = parseFloat(m[2]!.replace(/,/g, ''));
  if (!isFinite(low) || !isFinite(high)) return null;
  // Sanity-check: must look like annual comp, not some other dollar pair.
  if (low < 30_000 || high < low || high > 5_000_000) return null;
  return [low, high];
}

function unescapeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => safeFromCodePoint(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => safeFromCodePoint(parseInt(n, 16)));
}

function safeFromCodePoint(n: number): string {
  if (!isFinite(n) || n < 0 || n > 0x10ffff) return '';
  try { return String.fromCodePoint(n); } catch { return ''; }
}

export function htmlToText(s: string | undefined | null): string {
  if (!s) return '';
  let r = s
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\s*li[^>]*>/gi, '  • ')
    .replace(/<\/\s*li\s*>/gi, '\n')
    .replace(/<\s*h[1-6][^>]*>/gi, '\n')
    .replace(/<\/\s*h[1-6]\s*>/gi, '\n')
    .replace(/<\/\s*(p|div|ul|ol|section)\s*>/gi, '\n')
    .replace(/<[^>]+>/g, '');
  r = unescapeHtmlEntities(r);
  r = r.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n');
  return r.trim();
}

export function isUSARemote(j: { locations?: string[]; location?: string }): boolean {
  // work_location_option is unreliable: "USA - Remote" jobs are split between
  // 'onsite' and 'remote_local'. Trust the location string instead.
  const locs = j.locations ?? (j.location ? [j.location] : []);
  return locs.some(l => (l ?? '').trim() === 'USA - Remote');
}
