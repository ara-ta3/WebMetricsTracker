import { Config, Either, pipe } from "effect";
import { parse } from "yaml";
import * as fs from "fs";
import type {
  WebsiteConfigFile,
  WebsiteConfig,
} from "../domain/WebsiteConfig.js";

export function loadWebsiteConfigs(): Config.Config<WebsiteConfig[]> {
  return pipe(
    Config.string("CONFIG_FILE_PATH"),
    Config.withDefault("config/websites.yaml"),
    Config.mapAttempt((filePath) => fs.readFileSync(filePath, "utf8")),
    Config.mapAttempt((yaml) => parse(yaml) as WebsiteConfigFile),
    Config.mapOrFail((parsed) => {
      if (!parsed?.websites || !Array.isArray(parsed.websites)) {
        Either.left(
          new Error(
            `Invalid YAML structure: 'websites' array is required. parsed: ${JSON.stringify(parsed)}`,
          ),
        );
      }
      return Either.right(parsed.websites);
    }),
  );
}

