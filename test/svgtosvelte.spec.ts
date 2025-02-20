import fs from 'node:fs/promises';
import { describe, it, expect, afterAll } from 'vitest';
import { convertSvgsToSvelte } from '../src/index.js';
import { convertCasing, Options } from '../src/utils.js';
import { execSync } from 'node:child_process';

const VARIANTS: Options[] = [
  // Right now we have ~128 possible combinations to test, I'll only test 4 😉
  {
    casing: 'camelCase',
    prefix: 'icon',
    suffix: '',
    useTypeScript: false,
    updatefwh: false,
    filter: [],
    exclude: ['24', '32'],
    registry: true
  },
  {
    casing: 'PascalCase',
    prefix: 'icon',
    suffix: 'author',
    useTypeScript: true,
    updatefwh: true,
    filter: ['32'],
    exclude: ['24'],
    registry: true,
    kit: true
  },
  {
    casing: 'snake_case',
    prefix: 'icon',
    suffix: 'author',
    useTypeScript: false,
    updatefwh: true,
    filter: ['32'],
    exclude: ['24'],
    registry: false
  },
  {
    casing: 'kebab-case',
    prefix: 'icon',
    suffix: 'author',
    useTypeScript: true,
    updatefwh: false,
    filter: ['32'],
    exclude: ['24'],
    registry: false
  }
];

afterAll(() => {
  fs.rm(`test/ts`, { recursive: true });
  fs.rm(`test/js`, { recursive: true });
});

describe.each(VARIANTS)('SVGToSvelte ($casing - TS: $useTypeScript - Reg: $registry)', async (options) => {
  const EXTENSION = options.useTypeScript ? 'ts' : 'js';
  const ROOT_OUTPUT = `test/${EXTENSION}/${options.casing.toLocaleLowerCase()}`;

  convertSvgsToSvelte('test/icons', ROOT_OUTPUT, options);

  const TEST_FILES = await fs.readdir('./test/icons');

  const TO_ICON_FOLDER = options.kit;

  const ICON_OUTPUT_PATH = TO_ICON_FOLDER ? `${ROOT_OUTPUT}/icon` : ROOT_OUTPUT;

  const FILES_COUNT = TEST_FILES.filter((item) => !options.filter?.some((f) => item.includes(f))).length;

  // Include the index file and the registry file if it's enabled
  const TOTAL_FILES = FILES_COUNT + (options.registry ? 2 : 1);

  const mapFiles = (files: string[], path: string) => {
    return files.map((file) => ({
      name: file.replace(file.slice(file.lastIndexOf('.')), ''),
      path: path + '/' + file,
      filename: file
    }));
  };

  const OUTPUT_FILES = await fs.readdir(ICON_OUTPUT_PATH).then((files) => mapFiles(files, ICON_OUTPUT_PATH));

  if (TO_ICON_FOLDER) {
    const EXTRA_FILES = await fs.readdir(`${ROOT_OUTPUT}`).then((files) => {
      return mapFiles(
        files.filter((item) => !item.includes('icon')),
        ROOT_OUTPUT
      );
    });
    OUTPUT_FILES.push(...EXTRA_FILES);
  }

  const COMPONENTS = OUTPUT_FILES.filter((file, index, arr) => {
    if (file.filename !== 'index.ts' && file.filename !== 'registry.json') {
      arr[index].name = convertCasing(
        file.filename.replace(file.filename.slice(file.filename.lastIndexOf('.')), ''),
        'PascalCase'
      );
      return true;
    }
  });
  const REEXPORT = OUTPUT_FILES.find((file) => file.filename === 'index.ts');
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
      COMPONENTS.map(
        (file) => `export { default as ${file.name} } from './${(TO_ICON_FOLDER ? 'icon/' : '') + file.filename}';`
      ).join('\n') + '\n';

    if (REGISTRY) {
      result += `export { default as ${REGISTRY.name} } from './${REGISTRY?.filename}';\n`;
    }

    expect(CONTENT).toBe(result);
  });

  it('Run Svelte Check', async () => {
    try {
      const output = execSync(`pnpm svelte-check --workspace ${ROOT_OUTPUT}`);
      expect(output.toString()).toContain('svelte-check found 0 errors and 0 warnings');
    } catch (e) {
      console.log(e.stdout.toString());
    }
  });
});
