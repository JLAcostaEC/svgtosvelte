import fs from "node:fs/promises";
import { describe, it, expect, afterAll } from "vitest";
import { svgsToSvelte } from "../src/index.js";
import { convertCasing, type Options } from "../src/index.js";
import { execSync } from "node:child_process";

// ── Variant generation ────────────────────────────────

type OptionValues = {
  [K in keyof Required<Options>]: Required<Options>[K][];
};

const OPTIONS_MATRIX: OptionValues = {
  casing: ["PascalCase", "kebab-case"],
  prefix: ["", "icon"],
  suffix: ["", "author"],
  useTypeScript: [true, false],
  attributes: [[], ["fill.currentColor"]],
  filter: [[], ["32"]],
  exclude: [[], ["24"]],
  registry: [true, false],
  dryRun: [false],
  force: [true],
};

function cartesian<T extends Record<string, unknown[]>>(
  matrix: T,
): Array<{ [K in keyof T]: T[K][number] }> {
  const keys = Object.keys(matrix) as (keyof T)[];
  const results: Array<{ [K in keyof T]: T[K][number] }> = [];

  function walk(index: number, current: Record<string, unknown>) {
    if (index === keys.length) {
      results.push({ ...current } as { [K in keyof T]: T[K][number] });
      return;
    }
    const key = keys[index];
    for (const value of matrix[key]) {
      current[key as string] = value;
      walk(index + 1, current);
    }
  }

  walk(0, {});
  return results;
}

// Exhaustive cartesian (256 variants) is expensive in CI (~80s CPU -> $$$).
// Default to one-at-a-time coverage of each option; opt into the full matrix
// locally with FULL_MATRIX=1.
const BASE: Options = {
  casing: "PascalCase",
  prefix: "",
  suffix: "",
  useTypeScript: true,
  attributes: [],
  filter: [],
  exclude: [],
  registry: false,
  force: true,
};

const ONE_AT_A_TIME: Options[] = [
  BASE,
  { ...BASE, casing: "kebab-case" },
  { ...BASE, prefix: "icon" },
  { ...BASE, suffix: "author" },
  { ...BASE, useTypeScript: false },
  { ...BASE, attributes: ["fill.currentColor"] },
  { ...BASE, filter: ["32"] },
  { ...BASE, exclude: ["24"] },
  { ...BASE, registry: true },
];

const VARIANTS = process.env.FULL_MATRIX ? cartesian(OPTIONS_MATRIX) : ONE_AT_A_TIME;

const mapFiles = (files: string[], path: string) =>
  files.map((file) => ({ name: file.split(".")[0], path: path + "/" + file, filename: file }));

afterAll(async () => {
  await fs.rm(`test/ts`, { recursive: true, force: true });
  await fs.rm(`test/js`, { recursive: true, force: true });
});

describe.each(VARIANTS)(
  "SVGToSvelte ($casing ts=$useTypeScript reg=$registry pre=$prefix suf=$suffix)",
  async (options) => {
    const EXTENSION = options.useTypeScript ? "ts" : "js";
    const tag = [
      options.casing,
      options.prefix || "noprefix",
      options.suffix || "nosuffix",
      options.attributes?.length ? "attrs" : "noattrs",
      options.filter?.length ? "filtered" : "nofilter",
      options.exclude?.length ? "excluded" : "noexclude",
      options.registry ? "reg" : "noreg",
    ].join("_");
    const ROOT_OUTPUT = `test/${EXTENSION}/${tag}`;

    await svgsToSvelte("test/icons", ROOT_OUTPUT, options);

    const TEST_FILES = await fs.readdir("./test/icons");

    const FILES_COUNT = TEST_FILES.filter(
      (item) => !options.filter?.some((f) => item.includes(f)),
    ).length;

    // Include index.ts file (and the registry.json file if enabled)
    const TOTAL_FILES = FILES_COUNT + (options.registry ? 2 : 1);

    const OUTPUT_FILES: {
      name: string;
      path: string;
      filename: string;
    }[] = [];

    OUTPUT_FILES.push(
      ...(await fs.readdir(ROOT_OUTPUT).then((files) => {
        return mapFiles(
          files.filter((item) => item.includes(".")),
          ROOT_OUTPUT,
        );
      })),
    );

    const COMPONENTS = OUTPUT_FILES.filter((file, index, arr) => {
      if (file.filename !== `index.${EXTENSION}` && file.filename !== "registry.json") {
        arr[index].name = convertCasing(
          file.filename.replace(file.filename.slice(file.filename.lastIndexOf(".")), ""),
          "PascalCase",
        );
        return true;
      }
    })
      // Output is deterministic and sorted by export name.
      .toSorted((a, b) => a.name.localeCompare(b.name));

    const REEXPORT = OUTPUT_FILES.find((file) => file.filename === `index.${EXTENSION}`);
    const REGISTRY = OUTPUT_FILES.find((file) => file.filename === "registry.json");

    it(`Should create ${TOTAL_FILES} files`, async () => {
      expect(OUTPUT_FILES.length).toBe(TOTAL_FILES);
    });

    it(`Should create index.${EXTENSION} file`, async () => {
      expect(OUTPUT_FILES.some((item) => item.filename === `index.${EXTENSION}`)).toBe(true);
    });

    if (options.registry) {
      it("Should create registry file", async () => {
        expect(OUTPUT_FILES.some((item) => item.filename === "registry.json")).toBe(true);
      });
    }
    if (options.exclude && options.exclude.length > 0) {
      it("Should exclude values from files names", async () => {
        expect(
          OUTPUT_FILES.some((item) => options.exclude!.some((f) => item.filename.includes(f))),
        ).toBe(false);
      });
    }

    it("Check if the reexports are valid", async () => {
      if (!REEXPORT) return;

      const CONTENT = await fs.readFile(REEXPORT.path, "utf8");

      let result =
        COMPONENTS.map((file) =>
          file.filename !== REEXPORT.filename
            ? `export { default as ${file.name} } from './${file.filename}';`
            : "",
        ).join("\n") + "\n";

      if (REGISTRY) {
        result += `export { default as ${REGISTRY.name} } from './${REGISTRY?.filename}';\n`;
      }

      expect(CONTENT).toBe(result);
    });
  },
);

// Run svelte-check once over all generated files
it("Run Svelte Check", { timeout: 60000 }, async () => {
  // Force human output: when piped (non-TTY), svelte-check >=4.6 defaults to
  // machine format, which would not contain the human summary string below.
  const output = execSync(`pnpm svelte-check --workspace test/ --output human`);
  expect(output.toString()).toContain("svelte-check found 0 errors and 0 warnings");
});
