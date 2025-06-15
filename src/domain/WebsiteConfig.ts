export interface GA4MetricConfig {
  propertyId: string;
}

export interface SearchConsoleMetricConfig {
  siteUrl: string;
}

export interface MetricsConfig {
  ga4?: GA4MetricConfig;
  searchConsole?: SearchConsoleMetricConfig;
}

export interface WebsiteConfig {
  name: string;
  metrics: MetricsConfig;
}

export interface WebsiteConfigFile {
  websites: WebsiteConfig[];
}