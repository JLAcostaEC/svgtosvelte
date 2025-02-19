import fs from 'fs';
import path from 'path';
import { convertCasing, getCleanName, type Options } from './utils.js';
import { createComponentWithAst } from './create-component.js';

export function convertSvgsToSvelte(sourceDir: string, destDir: string, options: Options) {
  const { prefix, suffix, casing, useTypeScript, updatefwh, filter, exclude, registry } = options;

  if (!fs.existsSync(sourceDir)) {
    console.error(`Source directory "${sourceDir}" does not exist.`);
    process.exit(1);
  }

  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  const files = fs.readdirSync(sourceDir).filter((file) => {
    const isSVG = path.extname(file) === '.svg';

    if (filter && filter.length > 0) {
      return isSVG && !filter.some((word) => file.includes(word));
    }

    return isSVG;
  });

  if (files.length === 0) {
    console.warn(`No SVG files found in "${sourceDir}".`);
    return;
  }

  const reexports: string[] = [];
  const registryData: Array<{ initialName: string; cleanName: string; componentName: string; fileDir: string }> = [];

  files.forEach((file) => {
    const filePath = path.join(sourceDir, file);
    const svgContent = fs.readFileSync(filePath, 'utf8');

    const baseName = path.basename(file, '.svg');

    let cleanName = baseName;

    if (exclude && exclude.length > 0) {
      cleanName = getCleanName(baseName, exclude);
    }

    const fullName = prefix + ' ' + cleanName + ' ' + suffix;

    // Component name always need to be PascalCase
    const componentName = convertCasing(fullName, 'PascalCase');

    const componentFileName = convertCasing(fullName, casing);

    const svelteComponent = createComponentWithAst(svgContent, file, !!useTypeScript, !!updatefwh);

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

    if (fs.existsSync(indexFilePath)) {
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
