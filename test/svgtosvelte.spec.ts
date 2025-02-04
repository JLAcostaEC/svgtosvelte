import fs from 'node:fs/promises';
import { describe, it, expect, afterAll } from 'vitest';
import { convertSvgsToSvelte } from '../src/index';
import { svelteJsTemplate, svelteTsTemplate } from '../src/utils';

describe('SVGToSvelteJS', async () => {
  afterAll(() => {
    fs.rm('test\\js', { recursive: true });
  });
  const fileCount = (await fs.readdir('./test/icons')).length;

  convertSvgsToSvelte('test/icons', 'test/js', {
    prefix: 'icon',
    suffix: '',
    casing: 'kebab-case',
    useTypeScript: false,
    updatefwh: false
  });

  const outputFiles = await fs.readdir('test/js');

  it(`Should create ${fileCount + 1} files`, async () => {
    expect(outputFiles.length).toBe(fileCount + 1);
  });

  it('Should create icon-fluent-add-circle-24-filled.svelte', async () => {
    expect(outputFiles.includes('icon-fluent-add-circle-24-filled.svelte')).toBe(true);
  });

  it('Should create icon-fluent-album-add-24-filled.svelte', async () => {
    expect(outputFiles.includes('icon-fluent-album-add-24-filled.svelte')).toBe(true);
  });

  it('Should create icon-fluent-alert-urgent-24-filled.svelte', async () => {
    expect(outputFiles.includes('icon-fluent-alert-urgent-24-filled.svelte')).toBe(true);
  });

  // Meaby we can use a better way to test this
  it.each(outputFiles)(`Verifing JS structure for %s`, async (file) => {
    const content = await fs.readFile(`test/js/${file}`, 'utf8');
    if (file === 'index.js') {
      expect(
        content.includes(
          "export { default as IconFluentAddCircle24Filled } from './icon-fluent-add-circle-24-filled.svelte';"
        )
      ).toBe(true);
      expect(
        content.includes(
          "export { default as IconFluentAlbumAdd24Filled } from './icon-fluent-album-add-24-filled.svelte';"
        )
      ).toBe(true);
      expect(
        content.includes(
          "export { default as IconFluentAlertUrgent24Filled } from './icon-fluent-alert-urgent-24-filled.svelte';"
        )
      ).toBe(true);
      return;
    }
    expect(content.includes(svelteJsTemplate)).toBe(true);
    expect(content.endsWith('</svg>')).toBe(true);
  });
});

describe('SVGToSvelteTS', async () => {
  afterAll(() => {
    fs.rm('test\\ts', { recursive: true });
  });

  const fileCount = (await fs.readdir('./test/icons')).length;

  convertSvgsToSvelte('test/icons', 'test/ts', {
    prefix: 'icon',
    suffix: '',
    casing: 'kebab-case',
    useTypeScript: true,
    updatefwh: false
  });

  const files = await fs.readdir('test/ts');

  it(`Should create ${fileCount + 1} files`, async () => {
    expect(files.length).toBe(fileCount + 1);
  });

  it('Should create icon-fluent-add-circle-24-filled.svelte', async () => {
    expect(files.includes('icon-fluent-add-circle-24-filled.svelte')).toBe(true);
  });

  it('Should create icon-fluent-album-add-24-filled.svelte', async () => {
    expect(files.includes('icon-fluent-album-add-24-filled.svelte')).toBe(true);
  });

  it('Should create icon-fluent-alert-urgent-24-filled.svelte', async () => {
    expect(files.includes('icon-fluent-alert-urgent-24-filled.svelte')).toBe(true);
  });

  it.each(files)(`Verifing TS structure for %s`, async (file) => {
    const content = await fs.readFile(`test/ts/${file}`, 'utf8');
    if (file === 'index.ts') {
      expect(
        content.includes(
          "export { default as IconFluentAddCircle24Filled } from './icon-fluent-add-circle-24-filled.svelte';"
        )
      ).toBe(true);
      expect(
        content.includes(
          "export { default as IconFluentAlbumAdd24Filled } from './icon-fluent-album-add-24-filled.svelte';"
        )
      ).toBe(true);
      expect(
        content.includes(
          "export { default as IconFluentAlertUrgent24Filled } from './icon-fluent-alert-urgent-24-filled.svelte';"
        )
      ).toBe(true);
      return;
    }
    expect(content.includes(svelteTsTemplate)).toBe(true);
    expect(content.endsWith('</svg>')).toBe(true);
  });
});
