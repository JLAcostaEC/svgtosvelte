import fs from "node:fs";
import { afterAll, bench, describe } from "vitest";
import { svgsToSvelte, silentLogger } from "../src/index.js";

// A representative multi-path icon.
const SVG = `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M12 2 2 7l10 5 10-5-10-5Z" fill="#000" />
  <path d="m2 17 10 5 10-5M2 12l10 5 10-5" fill="none" stroke="#000" />
</svg>`;

// Scale with BENCH_COUNT, e.g. `BENCH_COUNT=1000 pnpm bench`.
const COUNT = Number(process.env.BENCH_COUNT) || 500;
const ROOT = "test/.bench-tmp";
const SRC = `${ROOT}/src`;

fs.mkdirSync(SRC, { recursive: true });
for (let i = 0; i < COUNT; i++) {
  fs.writeFileSync(`${SRC}/icon-${String(i).padStart(4, "0")}.svg`, SVG);
}

afterAll(() => {
  fs.rmSync(ROOT, { recursive: true, force: true });
});

describe(`convert ${COUNT} icons`, () => {
  // Pure transform: name resolution + string manipulation, no disk writes.
  bench("transform only (dry-run)", async () => {
    await svgsToSvelte(SRC, `${ROOT}/dry`, { casing: "PascalCase", dryRun: true }, silentLogger);
  });

  // End to end, including the parallel, bounded-concurrency file writes.
  bench("full write", async () => {
    await svgsToSvelte(SRC, `${ROOT}/out`, { casing: "PascalCase", force: true }, silentLogger);
  });
});
