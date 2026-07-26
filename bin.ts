#!/usr/bin/env node

import { program, Option } from "commander";
import { svgsToSvelte, consoleLogger } from "./src/index.js";

// Injected at build time by tsdown's `define` (see tsdown.config.ts), so the
// whole package.json is not inlined into the published bin.
declare const __PKG_NAME__: string;
declare const __PKG_VERSION__: string;
declare const __PKG_DESCRIPTION__: string;

program
  .name(__PKG_NAME__)
  .description(__PKG_DESCRIPTION__)
  .version(__PKG_VERSION__)
  .argument("<source>", "Source directory containing SVG files")
  .argument("[destination]", "Destination directory for Svelte components", "src/lib")
  .option("-p, --prefix <prefix>", "Add a prefix to component names", "")
  .option("-s, --suffix <suffix>", "Add a suffix to component names", "")
  .addOption(
    new Option("-c, --casing <casing>", "Set casing for component names")
      .choices(["PascalCase", "camelCase", "snake_case", "kebab-case"])
      .default("PascalCase"),
  )
  .option("-t, --typescript", "Use TypeScript in generated components", false)
  .option("-a, --attributes [attributes...]", "Add/Override SVG attributes on demand", [])
  .option("-f, --filter [words...]", "Filter icons with specific words out of selection", [])
  .option("-e, --exclude [words...]", "Exclude specific words from the icon/component name", [])
  .option("-r, --registry", "Create a JSON object detailing each component info", false)
  .option("--dry-run", "Compute the conversion without writing any files", false)
  .option("--force", "Do not warn when the destination already contains files", false)
  .action(async (source, destination, options) => {
    try {
      await svgsToSvelte(
        source,
        destination,
        {
          prefix: options.prefix,
          suffix: options.suffix,
          casing: options.casing,
          useTypeScript: options.typescript,
          attributes: options.attributes,
          filter: options.filter,
          exclude: options.exclude,
          registry: options.registry,
          dryRun: options.dryRun,
          force: options.force,
        },
        consoleLogger,
      );

      consoleLogger.info(
        options.dryRun
          ? "Dry run complete — no files were written."
          : "SVG conversion completed successfully!",
      );
    } catch (error) {
      consoleLogger.error(
        `Error during SVG conversion: ${error instanceof Error ? error.message : String(error)}`,
      );
      process.exit(1);
    }
  });

program.parseAsync().catch((error) => {
  consoleLogger.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
