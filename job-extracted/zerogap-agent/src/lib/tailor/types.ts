export type CompanyType = "product" | "service" | "startup" | "other" | "unknown";
export type Confidence = "high" | "medium" | "low";

export interface CompanyInfo {
  name: string;
  url?: string;
  type: CompanyType;
  confidence: Confidence;
  evidence: string;
  /** True only when the company's own page was actually read. */
  pageFetched: boolean;
  pageNote?: string;
}

export interface Question {
  id: "scope" | "depth" | "company_type" | "length" | "keep";
  text: string;
  kind: "single" | "multi" | "text";
  options?: string[];
  default?: string | string[];
}

export interface Answers {
  scope: string[];
  depth: string;
  company_type: string;
  length: string;
  keep?: string;
}

export interface TailorInput {
  /** The file the user uploaded: the source of truth for every fact. */
  originalResume: string;
  /** The latest version in the chat (equals originalResume on the first pass). */
  currentResume: string;
  /** Job description. May also contain the user's own edit instructions. */
  jd: string;
  role: string;
  company: string;
  url?: string;
}

export interface TailorResult {
  resume_text: string;
  changes_made: string[];
  /** Things the job or the user asked for that the resume doesn't contain, so were NOT added. */
  not_edited: string[];
  warnings: string[];
  stats: { changedLines: number; totalLines: number; pctChanged: number };
}

export interface CheckResult {
  ats_score: number;
  trend_score: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  keyword_gaps: string[];
  suggestions: string[];
  coverage: { matched: string[]; missing: string[]; pct: number } | null;
}
