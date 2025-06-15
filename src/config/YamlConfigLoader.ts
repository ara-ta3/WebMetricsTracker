import { Config, pipe } from "effect";
import { parse } from "yaml";
import * as fs from "fs";
import type { WebsiteConfigFile, WebsiteConfig } from "../domain/WebsiteConfig.js";

export function loadWebsiteConfigs(): Config.Config<WebsiteConfig[]> {
  return pipe(
    Config.string("CONFIG_FILE_PATH").pipe(
      Config.withDefault("config/websites.yaml")
    ),
    Config.map((filePath) => {
      try {
        const yamlContent = fs.readFileSync(filePath, "utf8");
        const parsedData = parse(yamlContent) as WebsiteConfigFile;
        
        if (!parsedData?.websites || !Array.isArray(parsedData.websites)) {
          throw new Error("Invalid YAML structure: 'websites' array is required");
        }
        
        return parsedData.websites;
      } catch (error) {
        throw new Error(`Failed to load config from ${filePath}: ${error}`);
      }
    })
  );
}

export function extractGA4PropertyIds(websites: WebsiteConfig[]): string[] {
  return websites
    .filter((website) => website.metrics.ga4?.propertyId)
    .map((website) => website.metrics.ga4!.propertyId);
}