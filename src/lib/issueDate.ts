/**
 * ZeroGap AI — Issue Date Utilities
 *
 * CADENCE: Monthly issues (12 per year).
 * LAUNCH DATE: January 2025 → Issue Nº 1.
 *
 * Formula:
 *   issue = (year - LAUNCH_YEAR) * 12 + (month - LAUNCH_MONTH) + 1
 *   where month is 1-indexed.
 *
 * This means issues increment automatically on the 1st of each calendar month.
 * No manual edits required when rolling over to a new period.
 */

const LAUNCH_YEAR = 2025;
const LAUNCH_MONTH = 1; // January 2025 = Issue Nº 1

/** Dec–Feb = Winter, Mar–May = Spring, Jun–Aug = Summer, Sep–Nov = Fall */
function getSeason(month: number): string {
  // month is 1-indexed (1=Jan, 12=Dec)
  if (month === 12 || month <= 2) return "Winter";
  if (month <= 5) return "Spring";
  if (month <= 8) return "Summer";
  return "Fall";
}

const MONTH_ABBR = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];

export interface IssueLabel {
  /** e.g. "Issue Nº 19" */
  issueLabel: string;
  /** e.g. "Spring '26" */
  seasonYear: string;
  /** e.g. "JUL.2026" */
  monthYear: string;
  /** Numeric issue number, e.g. 19 */
  issueNumber: number;
}

export function getIssueLabel(now: Date = new Date()): IssueLabel {
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-indexed

  const issueNumber =
    Math.max(1, (year - LAUNCH_YEAR) * 12 + (month - LAUNCH_MONTH) + 1);

  const season = getSeason(month);
  // Short year: e.g. 2026 → '26
  const shortYear = String(year).slice(2);

  return {
    issueNumber,
    issueLabel: `Issue Nº ${issueNumber}`,
    seasonYear: `${season} \u2019${shortYear}`,
    monthYear: `${MONTH_ABBR[month - 1]}.${year}`,
  };
}
