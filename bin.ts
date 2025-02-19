#!/usr/bin/env node

import { program } from 'commander';
import pkg from './package.json' with { type: 'json' };
import { convertSvgsToSvelte } from './src/svg-to-svelte.js';

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
  .option('-u, --updatefwh', 'Update Fill to (currentColor), Width to (100%) and height to (auto)', false)
  .option('-f, --filter [words...]', 'Filter icons with specific words out of selection', [])
  .option('-e, --exclude [words...]', 'Exclude specific words from the icon/component name', [])
  .option('-r, --registry', 'Create a JSON object detailing each component info', false)
  .option(
    '-k, --kit',
    'Tell the CLI that you’re using SvelteKit, which will prevent errors caused by using the word SERVER in src/lib',
    false
  )
  .action((source, destination, options) => {
    try {
      convertSvgsToSvelte(source, destination, {
        prefix: options.prefix,
        suffix: options.suffix,
        casing: options.casing,
        useTypeScript: options.typescript,
        updatefwh: options.updatefwh,
        filter: options.filter,
        exclude: options.exclude,
        registry: options.registry,
        kit: options.kit
      });
      console.log('SVG conversion completed successfully!');
    } catch (error) {
      console.error('Error during SVG conversion:', error);
    }
  });

program.parse();
