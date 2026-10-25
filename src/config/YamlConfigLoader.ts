import { Config, Effect, pipe } from "effect";
import { parse } from "yaml";
import * as fs from "fs";
import type {
  WebsiteConfigFile,
  WebsiteConfig,
} from "../domain/WebsiteConfig.js";

const toError = (e: unknown): Error =>
  e instanceof Error ? e : new Error(String(e));

export function loadWebsiteConfigs(): Effect.Effect<
  WebsiteConfig[],
  Config.ConfigError | Error
> {
  return pipe(
    Config.String("CONFIG_FILE_PATH"),
    Config.withDefault("config/websites.yaml"),
    Effect.flatMap((filePath) =>
      Effect.try({
        try: () => fs.readFileSync(filePath, "utf8"),
        catch: toError,
      }),
    ),
    Effect.flatMap((yaml) =>
      Effect.try({
        try: () => parse(yaml) as WebsiteConfigFile,
        catch: toError,
      }),
    ),
    Effect.flatMap((parsed) =>
      parsed?.websites && Array.isArray(parsed.websites)
        ? Effect.succeed(parsed.websites)
        : Effect.fail(
            new Error(
              `Invalid YAML structure: 'websites' array is required. parsed: ${JSON.stringify(parsed)}`,
            ),
          ),
    ),
  );
}
