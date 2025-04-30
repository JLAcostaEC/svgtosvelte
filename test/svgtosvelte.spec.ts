import fs from 'node:fs/promises';
import { describe, it, expect, afterAll } from 'vitest';
import { convertSvgsToSvelte } from '../src/index.js';
import { convertCasing, type Options } from '../src/utils.js';
import { execSync } from 'node:child_process';

type TestOptions = Options & {
  destDir?: string;
};

const VARIANTS: TestOptions[] = [
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
    destDir: 'src/lib',
    useTypeScript: true,
    updatefwh: true,
    attributes: ['server.fill.red', '^add.*stroke.blue', 'color.green'],
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
  const ROOT_OUTPUT = `test/${EXTENSION}/${options.casing.toLowerCase()}/${options.destDir || ''}`;

  convertSvgsToSvelte('test/icons', ROOT_OUTPUT, options);

  const TEST_FILES = await fs.readdir('./test/icons');

  const TO_ICON_FOLDER = options.kit;

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

  if (TO_ICON_FOLDER) {
    OUTPUT_FILES.push(
      ...(await fs.readdir(`${ROOT_OUTPUT}/icons`).then((files) => {
        return mapFiles(
          files.filter((item) => item.includes('.svelte')),
          `${ROOT_OUTPUT}/icons`
        );
      }))
    );
  }

  OUTPUT_FILES.push(
    ...(await fs.readdir(ROOT_OUTPUT).then((files) => {
      return mapFiles(
        files.filter((item) => item.includes('.')),
        ROOT_OUTPUT
      );
    }))
  );

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
        (file) =>
          `export { default as ${file.name} } from './${(file.name.toLowerCase().includes('server') && TO_ICON_FOLDER ? 'icons/' : '') + file.filename}';`
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
