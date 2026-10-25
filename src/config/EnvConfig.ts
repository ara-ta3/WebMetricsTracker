import "dotenv/config";

class EnvConfig {
  constructor(private readonly env: NodeJS.ProcessEnv) {}
  get(key: string): string {
    const value = this.env[key];
    if (!value) {
      throw new Error(`Environment variable ${key} is not set`);
    }
    return value;
  }
}
const c = new EnvConfig(process.env);
export const envConfig = {
  GoogleKeyFilePath: c.get("GA_KEYFILE"),
  SlackWebhookUrl: c.get("SLACK_WEBHOOK"),
};
