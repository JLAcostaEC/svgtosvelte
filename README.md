# SVG to Svelte

The Best Way to Convert SVG to Svelte 5 Components

## v3.0.0 — What's New

- **New CLI flags:** `--check` (run `svelte-check` on the output), `--dry-run` (preview without writing any files), and `--force` (skip the "destination not empty" warning).
- **Safer output:** names that would be invalid JS identifiers are sanitized (`24-circle.svg` → `Icon24Circle`), name collisions are detected and reported instead of silently overwriting, and re-running is **idempotent** — the barrel `index` and `registry.json` are regenerated/merged (never duplicated) and sorted for stable diffs.
- **Attribute values containing dots** are supported via `attr=value` (e.g. `-a opacity=0.5`).
- **Parallel file I/O** with bounded concurrency.

### Breaking changes

- **`svgsToSvelte` is now async** and returns `Promise<ConvertResult>` — `await` it. The library no longer prints or calls `process.exit`; it **throws** on errors and accepts an optional `logger` (import `consoleLogger`, or pass your own). The CLI is unchanged.
- **`svelte-check` no longer runs automatically** on every conversion — opt in with `--check`. It is now an optional peer dependency.

### Performance

Measured with `pnpm bench` (500 icons, Node 24 — results vary by machine):

| Stage                     | Time (500 icons) | Per icon |
| ------------------------- | ---------------- | -------- |
| Transform only (dry-run)  | ~61 ms           | ~0.12 ms |
| Full write (parallel I/O) | ~566 ms          | ~1.13 ms |

File I/O dominates — the transform itself is ≈9× faster than writing the files — which is why writes run with bounded concurrency.

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- [Options](#options)
- [Examples](#examples)
- [API](#api)
- [License](#license)
- [Contributing](#contributing)

## Installation

To install the package, use the following command:

```sh
npm install -D @jlacostaec/svgtosvelte
```

```sh
pnpm add -D @jlacostaec/svgtosvelte
```

```sh
yarn add -D @jlacostaec/svgtosvelte
```

## Usage

You can use the `svgtosvelte` CLI to convert SVG files to Svelte components. The basic command is:

```sh
svgtosvelte <source> [destination] [options]
```

- `<source>`: Source directory containing SVG files.
- `[destination]`: Destination directory for Svelte components (default: src/lib).

### Options

- `-p, --prefix <prefix>`: Add a prefix to component names (default: '').
- `-s, --suffix <suffix>`: Add a suffix to component names (default: '').
- `-c, --casing <casing>`: Set casing for component names. One of `PascalCase`, `camelCase`, `snake_case`, `kebab-case` (default: PascalCase). Invalid values are rejected with a clear error.
- `-t, --typescript`: Use TypeScript in generated components (default: false).
- `-a, --attributes`: Add/Override SVG attributes on demand (default: []). See [Attributes format](#attributes-format).
- `-f, --filter`: Filter icons with specific words out of selection (default: []).
- `-e, --exclude`: Exclude specific words from the icon/component name (default: []).
- `-r, --registry`: Create a JSON object detailing each component info (default: false).
- `--check`: Run `svelte-check` on the generated components (default: false). Requires `svelte-check` to be installed (it is an **optional** peer dependency).
- `--dry-run`: Compute the conversion and log what would happen **without writing any files** (default: false).
- `--force`: Do not warn when the destination directory already contains files (default: false).

### Attributes format

Each `-a` token adds or overrides an attribute on the `<svg>` tag:

- `attr.value` → applies to all icons, e.g. `fill.currentColor`.
- `attr=value` → use `=` when the **value contains dots**, e.g. `opacity=0.5`, `transform=scale(1.5)`.
- `pattern.attr.value` → only icons whose filename contains `pattern`, e.g. `server.fill.red`.
- `^pattern.attr.value` → only icons whose filename does **not** contain `pattern`.
- `*attr.value` → apply to every known SVG element tag (`path`, `circle`, …), not just `<svg>`, e.g. `*fill.currentColor`.

> The dot is the legacy separator, so with `attr.value` the value cannot contain dots — use `attr=value` in that case.

### Notes on generated names

- Component file names are converted to the chosen casing; the matching **export name** is always PascalCase and a valid JS identifier. Names that would start with a digit (e.g. `24-circle.svg`) are prefixed with `Icon` → `Icon24Circle`.
- Re-running over the same destination is safe and **idempotent**: the barrel `index` and `registry.json` are regenerated/merged, never duplicated. Output is sorted, so diffs stay stable.
- If two source files map to the same component name, the collision is reported and the duplicate is skipped (see the returned `skipped` list in the API).

## Examples

Convert SVG files in the icons directory to Svelte components in the src/lib directory:

```sh
svgtosvelte icons
```

Convert SVG files with a prefix and suffix:

```sh
svgtosvelte icons -p Icon -s Component
```

Convert SVG files from a SVG Package to different output folder with camelCase naming and TypeScript:

```sh
svgtosvelte node_modules/path-to-pkg/icons/ src/utils/icons -c camelCase -t
```

Override fill to `currentColor` and make the SVG responsive (V1 `-u` equivalent):

```sh
svgtosvelte icons -a fill.currentColor width.100% height.auto
```

Use `=` for values that contain dots, and preview without writing:

```sh
svgtosvelte icons -a opacity=0.5 "transform=scale(1.5)" --dry-run
```

Convert and validate the output with `svelte-check`:

```sh
svgtosvelte icons -t --check
```

## API

You can also use the package programmatically. The function is **async** and returns a structured result; it never writes to the console or calls `process.exit` on its own — pass a logger for output and `try/catch` for errors.

```ts
import { svgsToSvelte } from '@jlacostaec/svgtosvelte';

svgsToSvelte(source: string, outDir: string, options: Options, logger?: Logger): Promise<ConvertResult>
```

### Parameters

- `source: string`: The folder containing all the SVG files to be converted.
- `outDir: string`: Destination folder for all created Svelte files.
- `option.prefix: string`: The name appended to the beginning of each component name.
- `option.suffix: string`: The name appended to the end of each component name.
- `option.casing: CasingFormat`: Convert all component names to the given casing (`PascalCase`, `camelCase`, `kebab-case`, `snake_case`).
- `option.useTypeScript: boolean`: Whether to use TS for file types or not.
- `option.attributes: string[]`: Add/Override SVG attributes on demand (default: []).
- `option.filter: string[]`: Filter icons with specific words out of selection (default: []).
- `option.exclude: string[]`: Exclude specific words from the icon/component name (default: []).
- `option.registry: boolean`: Create a JSON object detailing each component info (default: false).
- `option.dryRun: boolean`: Compute everything without writing any file (default: false).
- `option.force: boolean`: Skip the "destination not empty" warning (default: false).
- `logger?: Logger`: Optional sink for messages. Defaults to silent. Import `consoleLogger` for a ready-made one, or pass your own `{ info, warn, error, table? }`.

### Returns — `Promise<ConvertResult>`

```ts
type ConvertResult = {
  components: Array<{ source: string; componentName: string; outputPath: string }>;
  skipped: Array<{ source: string; reason: "filtered" | "collision" | "invalid-name" }>;
  indexPath: string;
  registryPath?: string;
};
```

### Example

```typescript
import { svgsToSvelte, consoleLogger } from "@jlacostaec/svgtosvelte";

const result = await svgsToSvelte(
  "src/path-to-svgs-folder/",
  "src/lib/",
  {
    prefix: "Svg2Svelte",
    suffix: "byAuthor",
    casing: "PascalCase",
    useTypeScript: true,
    attributes: ["fill.currentColor", "width.100%", "height.auto"],
    filter: [],
    exclude: ["2"],
    registry: true,
  },
  consoleLogger, // omit for a silent run
);

console.log(`Created ${result.components.length}, skipped ${result.skipped.length}`);
```

```
Output files

-> src/lib/
    -------------------
      Svg2SvelteAlertFillByAuthor.svelte
      ...RestOfIcons.svelte
      registry.json
      index.ts
    -------------------
```

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE.md) file for details.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any changes.

## Contact

For any questions or feedback, please [contact me here](https://jorgelacosta.com).


## v2.0.0 - Changes if you are upgrading from v1

V2 was a complete rewrite focused on **speed** and **simplicity**. The SVG-to-Svelte conversion no longer parses an AST — it works directly on the SVG string, making it dramatically faster and removing heavy dependencies.

### Performance

By dropping AST parsing for direct string manipulation — and removing the `svelte/compiler` and `estree-walker` dependencies — V2 is **up to 5× faster than V1**.

### Breaking Changes (v1 → v2)

- **`-k, --kit` option removed** — SvelteKit `src/lib/icons` folder protection is no longer needed.
- **`-u, --updatefwh` option removed** — Use `-a` (attributes) instead: `-a fill.currentColor width.100% height.auto`.