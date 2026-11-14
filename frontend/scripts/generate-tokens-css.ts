/** Regenerates src/theme/tokens.css from src/theme/tokens.ts. Run: npm run tokens */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { buildTokensCss } from "../src/theme/cssVariables.ts";

const target = fileURLToPath(
  new URL("../src/theme/tokens.css", import.meta.url),
);
writeFileSync(target, buildTokensCss(), "utf8");
console.log(`Wrote ${target}`);
