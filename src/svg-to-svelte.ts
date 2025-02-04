import fs from 'fs';
import path from 'path';
import { convertCasing, type CasingFormat } from './utils.js';
import { createComponentWithAst } from './create-component.js';

export function convertSvgsToSvelte(
  sourceDir: string,
  destDir: string,
  options: { prefix: string; suffix: string; casing: CasingFormat; useTypeScript: boolean; updatefwh: boolean }
) {
  if (!fs.existsSync(sourceDir)) {
    console.error(`Source directory "${sourceDir}" does not exist.`);
    process.exit(1);
  }

  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  const files = fs.readdirSync(sourceDir).filter((file) => path.extname(file) === '.svg');

  if (files.length === 0) {
    console.warn(`No SVG files found in "${sourceDir}".`);
    return;
  }

  const { prefix, suffix, casing, useTypeScript, updatefwh } = options;
  const reexports: string[] = [];

  files.forEach((file) => {
    const filePath = path.join(sourceDir, file);
    const svgContent = fs.readFileSync(filePath, 'utf8');

    const baseName = path.basename(file, '.svg');

    const fullName = prefix + ' ' + baseName + ' ' + suffix;

    // Component name always need to be PascalCase
    const componentName = convertCasing(fullName, 'PascalCase');

    const componentFileName = convertCasing(fullName, casing);

    const svelteComponent = createComponentWithAst(svgContent, file, useTypeScript, updatefwh);

    const svelteFilename = `${componentFileName}.svelte`;
    const outputFilePath = path.join(destDir, svelteFilename);

    fs.writeFileSync(outputFilePath, svelteComponent, 'utf8');
    console.log(`Created component: ${outputFilePath}`);

    reexports.push(`export { default as ${componentName} } from './${svelteFilename}';`);
  });

  const indexExtension = useTypeScript ? 'ts' : 'js';
  const indexFilePath = path.join(destDir, `index.${indexExtension}`);

  let existingIndexContent = '';
  if (fs.existsSync(indexFilePath)) {
    existingIndexContent = fs.readFileSync(indexFilePath, 'utf-8');
  }

  const finalIndexContent = [existingIndexContent.trim(), ...reexports].filter(Boolean).join('\n') + '\n';

  fs.writeFileSync(indexFilePath, finalIndexContent, 'utf8');
  console.log(`${existingIndexContent.length > 0 ? 'Updated' : 'Created'} re-export file: ${indexFilePath}`);
}
