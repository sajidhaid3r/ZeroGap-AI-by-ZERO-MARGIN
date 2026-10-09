import { extractSkills } from "../agent/tools";

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

function lines(text: string): string[] {
  return text.split(/\r?\n/).map(norm).filter(Boolean);
}

/** How much of the resume actually changed. Shown to the user so "keep everything the same" is verifiable. */
export function lineChangeStats(before: string, after: string) {
  const old = new Set(lines(before));
  const now = lines(after);
  const changedLines = now.filter((l) => !old.has(l)).length;
  return { changedLines, totalLines: now.length, pctChanged: now.length ? Math.round((changedLines / now.length) * 100) : 0 };
}

const NUM = /\b\d[\d,.]*\+?%?/g;

function numbers(text: string): Set<string> {
  return new Set((text.match(NUM) ?? []).map((n) => n.replace(/[,.]+$/, "")));
}

/**
 * Facts that appear in the new resume but not in the ORIGINAL upload: tech skills and numbers.
 * Over several revisions this stops invented skills or metrics creeping in.
 */
export function unsupportedAdditions(original: string, output: string): string[] {
  const haveSkills = new Set(extractSkills(original));
  const haveNums = numbers(original);
  const out: string[] = [];
  for (const s of extractSkills(output)) if (!haveSkills.has(s)) out.push(`skill "${s}"`);
  for (const n of numbers(output)) if (!haveNums.has(n)) out.push(`number "${n}"`);
  return out;
}

/** Skills the job description names that the resume never mentions (deterministic, no LLM). */
export function keywordCoverage(resume: string, jd: string) {
  const want = extractSkills(jd);
  if (!want.length) return null;
  const have = new Set(extractSkills(resume));
  const matched = want.filter((s) => have.has(s));
  const missing = want.filter((s) => !have.has(s));
  return { matched, missing, pct: Math.round((matched.length / want.length) * 100) };
}
