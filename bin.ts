#!/usr/bin/env node

import { program } from 'commander';
import pkg from './package.json' with { type: 'json' };
import { svgsToSvelte } from './src/convert.js';
import { execSync } from 'node:child_process';

program
  .name(pkg.name)
  .description(pkg.description)
  .version(pkg.version)
  .argument('<source>', 'Source directory containing SVG files')
  .argument('[destination]', 'Destination directory for Svelte components', 'src/lib')
  .option('-p, --prefix <prefix>', 'Add a prefix to component names', '')
  .option('-s, --suffix <suffix>', 'Add a suffix to component names', '')
  .option('-c, --casing <casing>', 'Set Casing to component names', 'PascalCase')
  .option('-t, --typescript', 'Use TypeScript in generated components', false)
  .option('-a, --attributes [attributes...]', 'Add/Override SVG attributes on demand', [])
  .option('-f, --filter [words...]', 'Filter icons with specific words out of selection', [])
  .option('-e, --exclude [words...]', 'Exclude specific words from the icon/component name', [])
  .option('-r, --registry', 'Create a JSON object detailing each component info', false)

  .action((source, destination, options) => {
    try {
      svgsToSvelte(source, destination, {
        prefix: options.prefix,
        suffix: options.suffix,
        casing: options.casing,
        useTypeScript: options.typescript,
        attributes: options.attributes,
        filter: options.filter,
        exclude: options.exclude,
        registry: options.registry
      });
      try {
        const output = execSync(`pnpm svelte-check --workspace ${destination}`);
        if (!output.toString().includes('svelte-check found 0 errors and 0 warnings')) {
          console.error('Svelte check found errors or warnings:');
          console.log(output.toString());
        }
      } catch (e: unknown) {
        if (e instanceof Error && 'stdout' in e) {
          // @ts-expect-error Yeah... `e` is unknown
          console.log(e.stdout.toString());
        } else {
          console.error('An unknown error occurred during svelte-check:', e);
        }
      }
      console.log('SVG conversion completed successfully!');
    } catch (error) {
      console.error('Error during SVG conversion:', error);
    }
  });

program.parse();
