export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface MonthlyDateRanges {
  currentMonth: DateRange | null;
  currentMonthLastYear: DateRange | null;
  lastMonth: DateRange;
  lastMonthLastYear: DateRange;
}

interface YearMonthDay {
  year: number;
  month: number;
  day: number;
}

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

const pad = (n: number): string => String(n).padStart(2, "0");

const format = ({ year, month, day }: YearMonthDay): string =>
  `${year}-${pad(month)}-${pad(day)}`;

const lastDayOfMonth = (year: number, month: number): number =>
  new Date(Date.UTC(year, month, 0)).getUTCDate();

export function todayInJst(now: Date): YearMonthDay {
  const jst = new Date(now.getTime() + JST_OFFSET_MS);
  return {
    year: jst.getUTCFullYear(),
    month: jst.getUTCMonth() + 1,
    day: jst.getUTCDate(),
  };
}

function previousDay({ year, month, day }: YearMonthDay): YearMonthDay {
  const d = new Date(Date.UTC(year, month - 1, day - 1));
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
  };
}

function previousMonth(year: number, month: number): [number, number] {
  return month === 1 ? [year - 1, 12] : [year, month - 1];
}

const fullMonth = (year: number, month: number): DateRange => ({
  startDate: format({ year, month, day: 1 }),
  endDate: format({ year, month, day: lastDayOfMonth(year, month) }),
});

const monthToDate = (
  year: number,
  month: number,
  lastDay: number,
): DateRange => ({
  startDate: format({ year, month, day: 1 }),
  endDate: format({
    year,
    month,
    day: Math.min(lastDay, lastDayOfMonth(year, month)),
  }),
});

/**
 * GA4 のデータは前日分までが確定しているため、当月は「月初 〜 前日」を対象とする。
 * 当月1日の場合は前日が前月になるため、当月分のデータは存在しない扱い（null）にする。
 */
export function monthlyDateRanges(now: Date): MonthlyDateRanges {
  const today = todayInJst(now);
  const yesterday = previousDay(today);
  const isSameMonth =
    yesterday.year === today.year && yesterday.month === today.month;
  const [lastMonthYear, lastMonthMonth] = previousMonth(
    today.year,
    today.month,
  );

  return {
    currentMonth: isSameMonth
      ? monthToDate(today.year, today.month, yesterday.day)
      : null,
    currentMonthLastYear: isSameMonth
      ? monthToDate(today.year - 1, today.month, yesterday.day)
      : null,
    lastMonth: fullMonth(lastMonthYear, lastMonthMonth),
    lastMonthLastYear: fullMonth(lastMonthYear - 1, lastMonthMonth),
  };
}
