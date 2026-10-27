import type { DateRange } from "./DateRange.js";

export interface GA4Metrics {
  pv: number;
  activeUsers: number;
}

export interface GA4PeriodMetrics {
  range: DateRange;
  metrics: GA4Metrics | null;
}

/** sessionDefaultChannelGroup 別の流入 */
export interface GA4ChannelMetrics {
  channel: string;
  sessions: number;
}

/** sessionSource / sessionMedium 別の流入 */
export interface GA4SourceMetrics {
  source: string;
  medium: string;
  sessions: number;
}

export interface GA4LandingPageMetrics {
  landingPage: string;
  sessions: number;
}

export interface GA4LandingPageSourceMetrics extends GA4SourceMetrics {
  landingPage: string;
}

export interface GA4MonthlyMetrics {
  currentMonth: GA4PeriodMetrics | null;
  currentMonthLastYear: GA4PeriodMetrics | null;
  lastMonth: GA4PeriodMetrics;
  lastMonthLastYear: GA4PeriodMetrics;
  currentMonthChannels: GA4ChannelMetrics[];
  lastMonthChannels: GA4ChannelMetrics[];
  currentMonthSources: GA4SourceMetrics[];
  lastMonthSources: GA4SourceMetrics[];
  currentMonthLandingPages: GA4LandingPageMetrics[];
  lastMonthLandingPages: GA4LandingPageMetrics[];
  currentMonthLandingPageSources: GA4LandingPageSourceMetrics[];
  lastMonthLandingPageSources: GA4LandingPageSourceMetrics[];
}

export interface GA4PageDetails {
  path: string;
  url: string;
  title: string | null;
}

export interface GA4WebsiteData {
  websiteName: string;
  property: string;
  pages: GA4PageDetails[];
  pv: number;
  activeUsers: number;
  dailyChannels: GA4ChannelMetrics[];
  dailySources: GA4SourceMetrics[];
  dailyLandingPages: GA4LandingPageMetrics[];
  dailyLandingPageSources: GA4LandingPageSourceMetrics[];
  monthly: GA4MonthlyMetrics;
}
