import type { CompanyInfo, Question } from "./types";

export const SCOPE_OPTIONS = [
  "Wording of bullet points",
  "Skills section (order and keywords)",
  "Summary or objective",
  "Section order and headings (layout)",
  "Grammar and spelling only",
];
export const DEPTH_OPTIONS = [
  "Light touch: keep my wording, change only what the job needs",
  "Moderate: reword bullets toward the job description",
  "Strong: reorder sections and rewrite bullets",
];
export const COMPANY_OPTIONS = ["Product-based", "Service-based or consulting", "Startup", "Something else"];
export const LENGTH_OPTIONS = ["Keep the length as it is", "Fit on one page"];

const TYPE_TO_OPTION: Record<string, string> = {
  product: COMPANY_OPTIONS[0],
  service: COMPANY_OPTIONS[1],
  startup: COMPANY_OPTIONS[2],
  other: COMPANY_OPTIONS[3],
};

/**
 * The clarifying questions asked before any edit, as tappable options. Nothing is preselected for scope,
 * so the user must say what may change. Company type is preselected only when the company was identified confidently.
 */
export function buildQuestions(company: CompanyInfo): Question[] {
  const guess = company.confidence !== "low" ? TYPE_TO_OPTION[company.type] : undefined;
  return [
    { id: "scope", kind: "multi", text: "What should I change?", options: SCOPE_OPTIONS },
    { id: "depth", kind: "single", text: "How far should I go?", options: DEPTH_OPTIONS, default: DEPTH_OPTIONS[0] },
    {
      id: "company_type",
      kind: "single",
      text: guess ? `This looks like a ${guess.toLowerCase()} company. Is that right?` : "What kind of company is this?",
      options: COMPANY_OPTIONS,
      default: guess,
    },
    { id: "length", kind: "single", text: "What about length?", options: LENGTH_OPTIONS, default: LENGTH_OPTIONS[0] },
    { id: "keep", kind: "text", text: "Is there anything I must not touch? (optional)" },
  ];
}
