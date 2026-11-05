export const PERIOD_TABS = ["Daily", "Weekly", "Monthly", "All"] as const;

export type PeriodTab = (typeof PERIOD_TABS)[number];

export type DatedRecord = { createdAt: string };
export type DateRange = { start: Date; end: Date };

export type ReportWindow = {
  current: DateRange;
  previous: DateRange | null;
  rangeLabel: string;
  compareLabel: string | null;
  comparePhrase: string | null;
};

export function parseDate(value: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function formatDay(date: Date): string {
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

export function formatRange(range: DateRange): string {
  const start = formatDay(range.start);
  const end = formatDay(range.end);
  return start === end ? start : `${start} – ${end}`;
}

export function withinRange<T extends DatedRecord>(items: T[], range: DateRange): T[] {
  return items.filter((item) => {
    const d = parseDate(item.createdAt);
    return d === null ? true : d >= range.start && d <= range.end;
  });
}

// The selected tab defines the counted window; the comparison window is always the
// like-for-like stretch of time the percentage on each metric is measured against.
export function getReportWindow(tab: PeriodTab, earliest: string, now: Date): ReportWindow {
  let start: Date;
  if (tab === "Daily") {
    start = startOfDay(now);
  } else if (tab === "Weekly") {
    start = new Date(now);
    start.setDate(start.getDate() - 7);
  } else if (tab === "Monthly") {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  } else {
    const oldest = parseDate(earliest);
    start = oldest ? startOfDay(oldest) : startOfDay(now);
  }

  const current = { start, end: now };
  if (tab === "All") {
    return { current, previous: null, rangeLabel: formatRange(current), compareLabel: null, comparePhrase: null };
  }

  const span = now.getTime() - start.getTime();
  let previous: DateRange;
  let comparePhrase: string;

  if (tab === "Daily") {
    const prevStart = new Date(current.start);
    prevStart.setDate(prevStart.getDate() - 1);
    const prevEnd = new Date(now);
    prevEnd.setDate(prevEnd.getDate() - 1);
    previous = { start: prevStart, end: prevEnd };
    comparePhrase = "yesterday, up to the same time";
  } else if (tab === "Monthly") {
    const prevStart = new Date(current.start.getFullYear(), current.start.getMonth() - 1, 1);
    previous = { start: prevStart, end: new Date(prevStart.getTime() + span) };
    comparePhrase = "the same number of days into the previous month";
  } else {
    previous = { start: new Date(current.start.getTime() - span - 1), end: new Date(current.start.getTime() - 1) };
    comparePhrase = "the 7 days immediately before it";
  }

  return {
    current,
    previous,
    rangeLabel: formatRange(current),
    compareLabel: formatRange(previous),
    comparePhrase,
  };
}

// The oldest dated record in a list, used as the starting point of the "All" window.
export function earliestOf(items: DatedRecord[]): string {
  let oldest = "";
  items.forEach((item) => {
    const d = parseDate(item.createdAt);
    if (d && (!oldest || d < parseDate(oldest)!)) oldest = item.createdAt;
  });
  return oldest;
}
