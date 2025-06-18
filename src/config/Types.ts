export const TYPES = {
  config: {
    GoogleKeyFilePath: Symbol.for("GoogleKeyFilePath"),
    SlackWebhookUrl: Symbol.for("SlackWebhookUrl"),
    SentryDsn: Symbol.for("SentryDsn"),
  },
  PVQuery: Symbol.for("PQuery"),
  SearchConsoleQuery: Symbol.for("SearchConsoleQuery"),
  SlackCommand: Symbol.for("SlackCommand"),
  WebMetricsCollector: Symbol.for("WebMetricsCollector"),
  ErrorReporter: Symbol.for("ErrorReporter"),
};
