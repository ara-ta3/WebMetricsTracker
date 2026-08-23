import type { DateRange } from "./DateRange.js";

export interface GA4Metrics {
  pv: number;
  activeUsers: number;
}

export interface GA4PeriodMetrics {
  range: DateRange;
  metrics: GA4Metrics | null;
}

export interface GA4MonthlyMetrics {
  currentMonth: GA4PeriodMetrics | null;
  currentMonthLastYear: GA4PeriodMetrics | null;
  lastMonth: GA4PeriodMetrics;
  lastMonthLastYear: GA4PeriodMetrics;
}

export interface GA4WebsiteData {
  websiteName: string;
  property: string;
  pv: number;
  activeUsers: number;
  monthly: GA4MonthlyMetrics;
}
