import { Config, Effect, Either, pipe } from "effect";
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
    Config.mapOrFail((yaml) => {
      const parsed = parse(yaml) as WebsiteConfigFile;
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

export function extractGA4PropertyIds(websites: WebsiteConfig[]): string[] {
  return websites
    .filter((website) => website.metrics.ga4?.propertyId)
    .map((website) => website.metrics.ga4!.propertyId);
}
