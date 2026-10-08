import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateCloudConfig } from "../src/cloud.js";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const starter = JSON.parse(
  await fs.readFile(path.join(root, "data/starter.json"), "utf8"),
);
if (!Array.isArray(starter) || starter.length)
  throw new Error("Publicatie geblokkeerd: starter.json moet [] zijn.");
validateCloudConfig(
  JSON.parse(await fs.readFile(path.join(root, "config.json"), "utf8")),
);
async function check(dir) {
  for (const item of await fs.readdir(dir, { withFileTypes: true })) {
    if (["node_modules", ".git"].includes(item.name)) continue;
    const full = path.join(dir, item.name),
      rel = path.relative(root, full);
    if (
      /(?:^|\/)(?:private|exports|helder-herimport)(?:\/|$)|\.env(?:\.|$)|Helder_.*\.json$|(?:Algemene_filosofie_50|Continentale_filosofie_382)|432_kaarten.*\.(zip|json|md)$/i.test(
        rel,
      )
    )
      throw new Error("Privébestand gevonden: " + rel);
    if (item.isDirectory()) await check(full);
  }
}
await check(root);
console.log(
  "Publicatiecontrole OK: lege start, geen bekende privéexports, alleen publieke syncconfig.",
);
