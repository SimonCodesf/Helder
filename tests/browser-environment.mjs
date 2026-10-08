// Optional test dependencies. The application itself has no build/install step.
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
export const TEST_URL = (
  process.env.TEST_URL || "http://127.0.0.1:4173"
).replace(/\/$/, "");
export const OUTPUT_DIR = path.resolve(
  process.env.TEST_OUTPUT ||
    fileURLToPath(new URL("../test-output/", import.meta.url)),
);
export const EXAMPLE_FILE = new URL("../data/voorbeeld.md", import.meta.url);
export const outputFile = (name) => path.join(OUTPUT_DIR, name);
await fs.mkdir(OUTPUT_DIR, { recursive: true });
const specifier = process.env.PLAYWRIGHT_MODULE || "playwright";
export const { chromium } = await import(
  path.isAbsolute(specifier) ? pathToFileURL(specifier).href : specifier
);
export const launchOptions = {
  headless: true,
  ...(process.env.CHROMIUM_BIN
    ? { executablePath: process.env.CHROMIUM_BIN }
    : {}),
  ...(process.env.CHROMIUM_NO_SANDBOX === "1"
    ? { args: ["--no-sandbox"] }
    : {}),
};
