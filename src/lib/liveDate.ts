const DEFAULT_LOCALE = "en-IN";

export function formatLiveDate(date: Date, locale = DEFAULT_LOCALE): string {
  return date.toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatLiveDateTime(date: Date, locale = DEFAULT_LOCALE): string {
  return date.toLocaleString(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatShortDate(date: Date, locale = DEFAULT_LOCALE): string {
  return date.toLocaleDateString(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function getCurrentQuarter(date: Date): number {
  return Math.floor(date.getMonth() / 3) + 1;
}
