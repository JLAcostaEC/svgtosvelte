export type CasingFormat = "camelCase" | "PascalCase" | "snake_case" | "kebab-case";

export const CASING_FORMATS: readonly CasingFormat[] = [
  "PascalCase",
  "camelCase",
  "snake_case",
  "kebab-case",
];

export type Options = {
  prefix?: string;
  suffix?: string;
  casing: CasingFormat;
  useTypeScript?: boolean;
  attributes?: string[];
  filter?: string[];
  exclude?: string[];
  registry?: boolean;
  /** Compute the conversion without writing any file to disk. */
  dryRun?: boolean;
  /** Suppress the warning emitted when the destination already contains files. */
  force?: boolean;
};

export type FileWithOverrides = {
  file: string;
  overrides: AttributeOverride[];
};

export type AttributeOverride = {
  attr: string;
  value: string;
};

/** A single entry of the generated `registry.json`. */
export type RegistryEntry = {
  initialName: string;
  cleanName: string;
  componentName: string;
  fileDir: string;
};

/** Why a source SVG did not produce a component. */
export type SkipReason = "filtered" | "collision" | "invalid-name";

/** Structured result returned by {@link svgsToSvelte}, for programmatic use. */
export type ConvertResult = {
  components: Array<{ source: string; componentName: string; outputPath: string }>;
  skipped: Array<{ source: string; reason: SkipReason }>;
  indexPath: string;
  registryPath?: string;
};

/**
 * Sink for human-facing messages. The library defaults to a no-op logger so it
 * stays silent inside other processes; pass {@link consoleLogger} (or your own)
 * to surface output. `table` is optional.
 */
export type Logger = {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  table?(data: unknown): void;
};
