import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { convertCasing, getCleanName, toSafeIdentifier } from "./casing.js";
import { mapFilesAttributes } from "./attributes.js";
import { createComponent } from "./component.js";
import { silentLogger } from "./logger.js";
import { CASING_FORMATS } from "./types.js";
import type { AttributeOverride, ConvertResult, Logger, Options, RegistryEntry } from "./types.js";

const CONCURRENCY = 8;

/** Maps each item through `fn` with at most `limit` running at once; preserves input order. */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = Array.from({ length: items.length }) as R[];
  let cursor = 0;

  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      // oxlint-disable-next-line no-await-in-loop -- bounded concurrency: each runner drains items sequentially by design
      results[index] = await fn(items[index], index);
    }
  });

  await Promise.all(runners);
  return results;
}

function validateOptions(options: Options): void {
  if (!CASING_FORMATS.includes(options.casing)) {
    throw new Error(
      `Invalid casing "${options.casing}". Use one of: ${CASING_FORMATS.join(", ")}.`,
    );
  }
}

type PlannedComponent = {
  file: string;
  overrides: AttributeOverride[];
  baseName: string;
  cleanName: string;
  componentName: string;
  svelteFilename: string;
};

/**
 * Converts every SVG in `sourceDir` into a Svelte 5 component in `destDir` and
 * (re)generates a barrel `index` file. Returns a structured {@link ConvertResult}.
 *
 * The library never writes to the console or exits the process: pass a
 * {@link Logger} (e.g. `consoleLogger`) for output, and handle thrown errors.
 */
export async function svgsToSvelte(
  sourceDir: string,
  destDir: string,
  options: Options,
  logger: Logger = silentLogger,
): Promise<ConvertResult> {
  validateOptions(options);

  const {
    prefix = "",
    suffix = "",
    casing,
    useTypeScript = false,
    attributes = [],
    filter = [],
    exclude = [],
    registry = false,
    dryRun = false,
    force = false,
  } = options;

  if (!existsSync(sourceDir)) {
    throw new Error(`Source directory "${sourceDir}" does not exist.`);
  }

  const result: ConvertResult = {
    components: [],
    skipped: [],
    indexPath: path.join(destDir, `index.${useTypeScript ? "ts" : "js"}`),
  };

  const destExists = existsSync(destDir);
  if (!destExists && !dryRun) {
    await fs.mkdir(destDir, { recursive: true });
  } else if (destExists && !force && !dryRun) {
    const hasFiles = (await fs.readdir(destDir)).length > 0;
    if (hasFiles) {
      logger.warn(
        `Destination "${destDir}" is not empty; existing components may be overwritten. ` +
          `Pass --force to silence this warning or --dry-run to preview.`,
      );
    }
  }

  // Read + filter + sort for deterministic output (independent of the OS).
  const rawFiles = (await fs.readdir(sourceDir))
    .filter((file) => path.extname(file) === ".svg")
    .toSorted((a, b) => a.localeCompare(b));

  const filtered = rawFiles.filter((file) => {
    const dropped = filter.some((word) => file.includes(word));
    if (dropped) result.skipped.push({ source: file, reason: "filtered" });
    return !dropped;
  });

  if (filtered.length === 0) {
    logger.warn(`No SVG files to convert in "${sourceDir}".`);
    return result;
  }

  const files = mapFilesAttributes(filtered, attributes, logger);

  // Resolve names deterministically and detect collisions before writing anything.
  const usedNames = new Map<string, string>();
  const planned: PlannedComponent[] = [];

  for (const { file, overrides } of files) {
    const baseName = path.basename(file, ".svg");
    const cleanName = exclude.length > 0 ? getCleanName(baseName, exclude) : baseName;
    const fullName = [prefix, cleanName, suffix].filter(Boolean).join(" ");

    const componentName = toSafeIdentifier(convertCasing(fullName, "PascalCase"));
    const svelteFilename = `${convertCasing(fullName, casing)}.svelte`;

    if (usedNames.has(componentName)) {
      logger.warn(
        `Name collision: "${file}" maps to "${componentName}", same as "${usedNames.get(componentName)}". Skipping "${file}".`,
      );
      result.skipped.push({ source: file, reason: "collision" });
      continue;
    }

    usedNames.set(componentName, file);
    planned.push({ file, overrides, baseName, cleanName, componentName, svelteFilename });
  }

  // Generate components in parallel with bounded concurrency.
  const records = await mapWithConcurrency(planned, CONCURRENCY, async (component) => {
    const svgContent = await fs.readFile(path.join(sourceDir, component.file), "utf8");
    const svelteComponent = createComponent(svgContent, useTypeScript, component.overrides);
    const outputPath = path.join(destDir, component.svelteFilename);

    if (!dryRun) {
      await fs.writeFile(outputPath, svelteComponent, "utf8");
    }
    logger.info(`${dryRun ? "Would create" : "Created"} component: ${outputPath}`);

    return { ...component, outputPath };
  });

  result.components = records.map((r) => ({
    source: r.file,
    componentName: r.componentName,
    outputPath: r.outputPath,
  }));

  // Registry: merge by componentName so re-runs don't accumulate duplicates.
  if (registry) {
    const registryPath = path.join(destDir, "registry.json");
    result.registryPath = registryPath;

    const merged = new Map<string, RegistryEntry>();
    if (existsSync(registryPath)) {
      try {
        const existing = JSON.parse(await fs.readFile(registryPath, "utf8")) as RegistryEntry[];
        for (const entry of existing) merged.set(entry.componentName, entry);
      } catch {
        logger.warn(`Could not parse "${registryPath}"; regenerating it from scratch.`);
      }
    }

    for (const r of records) {
      merged.set(r.componentName, {
        initialName: r.baseName,
        cleanName: r.cleanName,
        componentName: r.componentName,
        fileDir: r.outputPath.replaceAll("\\", "/"),
      });
    }

    const finalRegistry = [...merged.values()].toSorted((a, b) =>
      a.componentName.localeCompare(b.componentName),
    );

    if (!dryRun) {
      await fs.writeFile(registryPath, JSON.stringify(finalRegistry, null, 2), "utf8");
    }
    logger.info(`${dryRun ? "Would create" : "Created"} registry file: ${registryPath}`);
  }

  // Regenerate the barrel from scratch so re-runs never duplicate exports.
  await writeIndex(
    destDir,
    records.map((r) => r.svelteFilename),
    result,
    { registry, dryRun },
    logger,
  );

  return result;
}

async function writeIndex(
  destDir: string,
  freshSvelteFiles: string[],
  result: ConvertResult,
  flags: { registry: boolean; dryRun: boolean },
  logger: Logger,
): Promise<void> {
  // Union of components already on disk and the ones produced in this run, so
  // incremental runs (and runs from multiple source folders) stay consistent.
  const onDisk = existsSync(destDir)
    ? (await fs.readdir(destDir)).filter((f) => f.endsWith(".svelte"))
    : [];

  const svelteFiles = [...new Set([...onDisk, ...freshSvelteFiles])].toSorted((a, b) =>
    a.localeCompare(b),
  );

  // Dedupe by export name to avoid `Duplicate export` syntax errors.
  const exportsByName = new Map<string, string>();
  for (const file of svelteFiles) {
    const exportName = toSafeIdentifier(
      convertCasing(path.basename(file, ".svelte"), "PascalCase"),
    );
    if (!exportsByName.has(exportName)) exportsByName.set(exportName, file);
  }

  const reexports = [...exportsByName.entries()]
    .toSorted((a, b) => a[0].localeCompare(b[0]))
    .map(([name, file]) => `export { default as ${name} } from './${file}';`);

  if (flags.registry) {
    reexports.push(`export { default as registry } from './registry.json';`);
  }

  const content = reexports.join("\n") + "\n";

  if (!flags.dryRun) {
    await fs.writeFile(result.indexPath, content, "utf8");
  }
  logger.info(`${flags.dryRun ? "Would write" : "Wrote"} re-export file: ${result.indexPath}`);
}
