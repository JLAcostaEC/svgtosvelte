import fs from 'node:fs';
import path from 'node:path';
import { convertCasing, getCleanName } from './casing.js';
import { mapFilesAttributes } from './attributes.js';
import { createComponent } from './component.js';
import type { Options } from './types.js';

export function svgsToSvelte(sourceDir: string, destDir: string, options: Options): void {
  const { prefix = '', suffix = '', casing, useTypeScript, attributes, filter, exclude, registry } = options;

  if (!fs.existsSync(sourceDir)) {
    console.error(`Source directory "${sourceDir}" does not exist.`);
    process.exit(1);
  }

  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  const rawFiles = fs.readdirSync(sourceDir).filter((file) => {
    const isSVG = path.extname(file) === '.svg';

    if (filter && filter.length > 0) {
      return isSVG && !filter.some((word) => file.includes(word));
    }

    return isSVG;
  });

  if (rawFiles.length === 0) {
    console.warn(`No SVG files found in "${sourceDir}".`);
    return;
  }

  const reexports: string[] = [];
  const registryData: Array<{ initialName: string; cleanName: string; componentName: string; fileDir: string }> = [];

  const files = mapFilesAttributes(rawFiles, attributes || []);

  files.forEach((file) => {
    const { file: fileName, overrides } = file;
    const filePath = path.join(sourceDir, fileName);
    const svgContent = fs.readFileSync(filePath, 'utf8');

    const baseName = path.basename(fileName, '.svg');

    let cleanName = baseName;

    if (exclude && exclude.length > 0) {
      cleanName = getCleanName(baseName, exclude);
    }

    const fullName = prefix + ' ' + cleanName + ' ' + suffix;

    const componentName = convertCasing(fullName, 'PascalCase');
    const componentFileName = convertCasing(fullName, casing);

    const svelteComponent = createComponent(svgContent, !!useTypeScript, overrides);

    const svelteFilename = `${componentFileName}.svelte`;
    const outputFilePath = path.join(destDir, svelteFilename);

    fs.writeFileSync(outputFilePath, svelteComponent, 'utf8');
    console.log(`Created component: ${outputFilePath}`);

    reexports.push(`export { default as ${componentName} } from './${svelteFilename}';`);

    if (registry) {
      registryData.push({
        initialName: baseName,
        cleanName: cleanName,
        componentName: componentName,
        fileDir: outputFilePath.replaceAll('\\', '/')
      });
    }
  });

  const indexExtension = useTypeScript ? 'ts' : 'js';
  const indexFilePath = path.join(destDir, `index.${indexExtension}`);

  let existingIndexContent = '';
  if (fs.existsSync(indexFilePath)) {
    existingIndexContent = fs.readFileSync(indexFilePath, 'utf-8');
  }

  if (registry) {
    const registryDataPath = path.join(destDir, 'registry.json');

    if (fs.existsSync(registryDataPath)) {
      const existingRegistryData = JSON.parse(fs.readFileSync(registryDataPath, 'utf8'));
      registryData.push(...existingRegistryData);
    }

    fs.writeFileSync(registryDataPath, JSON.stringify(registryData, null, 2), 'utf8');
    console.log(`Created registry file: ${registryDataPath}`);

    if (!existingIndexContent.includes("export { default as registry } from './registry.json';")) {
      reexports.push(`export { default as registry } from './registry.json';`);
    }
  }

  const finalIndexContent = [existingIndexContent.trim(), ...reexports].filter(Boolean).join('\n') + '\n';

  fs.writeFileSync(indexFilePath, finalIndexContent, 'utf8');
  console.log(`${existingIndexContent.length > 0 ? 'Updated' : 'Created'} re-export file: ${indexFilePath}`);
}
