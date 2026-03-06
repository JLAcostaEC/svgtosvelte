import fs from 'node:fs/promises';
import { describe, it, expect, afterAll } from 'vitest';
import { svgsToSvelte } from '../src/index.js';
import { convertCasing, type Options } from '../src/index.js';
import { execSync } from 'node:child_process';

// ── Variant generation ────────────────────────────────

type OptionValues = {
  [K in keyof Required<Options>]: Required<Options>[K][];
};

// For cloud testing, we won't be able to test all combinations of options (~80s CPU time -> $$$).
// Locally, you can change the OPTIONS_MATRIX to include more or fewer options as needed.
const OPTIONS_MATRIX: OptionValues = {
  casing: ['PascalCase', 'kebab-case'],
  prefix: ['', 'icon'],
  suffix: ['', 'author'],
  useTypeScript: [true, false],
  attributes: [[], ['fill.currentColor']],
  filter: [[], ['32']],
  exclude: [[], ['24']],
  registry: [true, false]
};

function cartesian<T extends Record<string, unknown[]>>(matrix: T): Array<{ [K in keyof T]: T[K][number] }> {
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

const VARIANTS = cartesian(OPTIONS_MATRIX);

afterAll(async () => {
  await fs.rm(`test/ts`, { recursive: true, force: true });
  await fs.rm(`test/js`, { recursive: true, force: true });
});

describe.each(VARIANTS)(
  'SVGToSvelte ($casing ts=$useTypeScript reg=$registry pre=$prefix suf=$suffix)',
  async (options) => {
    const EXTENSION = options.useTypeScript ? 'ts' : 'js';
    const tag = [
      options.casing,
      options.prefix || 'noprefix',
      options.suffix || 'nosuffix',
      options.attributes.length ? 'attrs' : 'noattrs',
      options.filter.length ? 'filtered' : 'nofilter',
      options.exclude.length ? 'excluded' : 'noexclude',
      options.registry ? 'reg' : 'noreg'
    ].join('_');
    const ROOT_OUTPUT = `test/${EXTENSION}/${tag}`;

    svgsToSvelte('test/icons', ROOT_OUTPUT, options);

    const TEST_FILES = await fs.readdir('./test/icons');

    const FILES_COUNT = TEST_FILES.filter((item) => !options.filter?.some((f) => item.includes(f))).length;

    // Include index.ts file (and the registry.json file if enabled)
    const TOTAL_FILES = FILES_COUNT + (options.registry ? 2 : 1);

    const mapFiles = (files: string[], path: string) => {
      return files.map((file) => ({
        name: file.split('.')[0],
        path: path + '/' + file,
        filename: file
      }));
    };

    const OUTPUT_FILES: {
      name: string;
      path: string;
      filename: string;
    }[] = [];

    OUTPUT_FILES.push(
      ...(await fs.readdir(ROOT_OUTPUT).then((files) => {
        return mapFiles(
          files.filter((item) => item.includes('.')),
          ROOT_OUTPUT
        );
      }))
    );

    const COMPONENTS = OUTPUT_FILES.filter((file, index, arr) => {
      if (file.filename !== `index.${EXTENSION}` && file.filename !== 'registry.json') {
        arr[index].name = convertCasing(
          file.filename.replace(file.filename.slice(file.filename.lastIndexOf('.')), ''),
          'PascalCase'
        );
        return true;
      }
    });

    const REEXPORT = OUTPUT_FILES.find((file) => file.filename === `index.${EXTENSION}`);
    const REGISTRY = OUTPUT_FILES.find((file) => file.filename === 'registry.json');

    it(`Should create ${TOTAL_FILES} files`, async () => {
      expect(OUTPUT_FILES.length).toBe(TOTAL_FILES);
    });

    it(`Should create index.${EXTENSION} file`, async () => {
      expect(OUTPUT_FILES.some((item) => item.filename === `index.${EXTENSION}`)).toBe(true);
    });

    if (options.registry) {
      it('Should create registry file', async () => {
        expect(OUTPUT_FILES.some((item) => item.filename === 'registry.json')).toBe(true);
      });
    }
    if (options.exclude && options.exclude.length > 0) {
      it('Should exclude values from files names', async () => {
        expect(OUTPUT_FILES.some((item) => options.exclude!.some((f) => item.filename.includes(f)))).toBe(false);
      });
    }

    it('Check if the reexports are valid', async () => {
      if (!REEXPORT) return false;

      const CONTENT = await fs.readFile(REEXPORT.path, 'utf8');

      let result =
        COMPONENTS.map((file) =>
          file.filename !== REEXPORT.filename ? `export { default as ${file.name} } from './${file.filename}';` : ''
        ).join('\n') + '\n';

      if (REGISTRY) {
        result += `export { default as ${REGISTRY.name} } from './${REGISTRY?.filename}';\n`;
      }

      expect(CONTENT).toBe(result);
    });
  }
);

// Run svelte-check once over all generated files
it('Run Svelte Check', { timeout: 60000 }, async () => {
  const output = execSync(`pnpm svelte-check --workspace test/`);
  expect(output.toString()).toContain('svelte-check found 0 errors and 0 warnings');
});
