# @jlacostaec/svgtosvelte

## 3.0.0

### Major Changes

- [#16](https://github.com/JLAcostaEC/svgtosvelte/pull/16) [`da340b3`](https://github.com/JLAcostaEC/svgtosvelte/commit/da340b399bffc83fec1a6e6f083b3f9c06d2d18e) Thanks [@JLAcostaEC](https://github.com/JLAcostaEC)! - breaking: Async API, correctness fixes, and tooling migration.

  **Breaking**

  - `svgsToSvelte` is now async and returns a structured `Promise<ConvertResult>` (`components`, `skipped`, `indexPath`, `registryPath`). `await` it.
  - The library no longer writes to the console or calls `process.exit`; it throws on errors and accepts an optional `logger` (a ready-made `consoleLogger` is exported). The CLI passes `consoleLogger` and maps errors to a non-zero exit code.
  - `svelte-check` integration is removed. The `--check` CLI flag is gone, conversions no longer run `svelte-check`, and the package no longer declares `svelte` or `svelte-check` as dependencies of any kind. Validate the generated components from your own project instead.

  **Fixes**

  - Names that start with a digit now produce a valid export identifier (e.g. `24-circle.svg` → `Icon24Circle`) instead of an invalid `export`.
  - Name collisions (e.g. `add-circle.svg` and `add_circle.svg`) are detected and reported instead of silently overwriting and emitting a duplicate export.
  - Re-running over the same destination is idempotent: the barrel `index` is regenerated from scratch and `registry.json` is merged by component name, so neither accumulates duplicates. Output is sorted for stable diffs.
  - `overrideAttributes` escapes user input used in regular expressions and replacement strings (`$` in values no longer corrupts the result).
  - Attribute values containing dots are supported via the new `attr=value` form (e.g. `opacity=0.5`); malformed tokens warn instead of being dropped silently.
  - `getCleanName` removes every occurrence of an excluded word, not just the first.
  - Self-closing `<svg />` inputs are handled correctly.
  - A corrupt `registry.json` no longer aborts the run.
  - Invalid `casing` values fail fast with a clear message.

  **Tooling & performance**

  - File I/O is async and runs with bounded concurrency.
  - Build migrated to tsdown (rolldown), lint to oxlint, and formatting to oxfmt.

  **New options**

  - `--dry-run` and `--force`.

## 2.0.0

### Major Changes

- feat!: complete rewrite of SVG to Svelte conversion for improved speed and simplicity ([#14](https://github.com/JLAcostaEC/svgtosvelte/pull/14))

## 1.2.0

### Minor Changes

- feat: new `-a` CLI option and deprecate `-u` ([#11](https://github.com/JLAcostaEC/svgtosvelte/pull/11))

## 1.1.7

### Patch Changes

- fix: move only necessary icons when using the `-k` option ([`74611e8`](https://github.com/JLAcostaEC/svgtosvelte/commit/74611e8fed89cce0a6f209402de94521d2698d3f))

## 1.1.6

### Patch Changes

- fix: better explanation of `-k` option and cleanup ([`8b8a53f`](https://github.com/JLAcostaEC/svgtosvelte/commit/8b8a53f00e86872c3446785843c06e9f6b498640))

## 1.1.5

### Patch Changes

- fix: better workaround for kit server-only modules + tests ([`cb6958c`](https://github.com/JLAcostaEC/svgtosvelte/commit/cb6958c4dd3a91495789a333e47614238dd411a4))

## 1.1.4

### Patch Changes

- fix: add jsdocs types for SvelteJSTemplate ([`01aed10`](https://github.com/JLAcostaEC/svgtosvelte/commit/01aed105d0f3ac49cb946db37f239d49a834517f))

## 1.1.3

### Patch Changes

- fix: add -k option to prevent errors caused by using the word SERVER in src/lib when using SvelteKit ([`4ea0f65`](https://github.com/JLAcostaEC/svgtosvelte/commit/4ea0f65b27ff0198e3e9c50a962c6f9ac6f9e12e))

## 1.1.2

### Patch Changes

- fix: check if registry file already exist to append the content instead of overwrite it ([`a485f51`](https://github.com/JLAcostaEC/svgtosvelte/commit/a485f51b33fdf3ff1f9a674efa74749177c50a7e))

## 1.1.1

### Patch Changes

- fix: include @render children before closing the svg tag ([`0d82593`](https://github.com/JLAcostaEC/svgtosvelte/commit/0d8259350d09f509afc6389111447c90481f7abc))

## 1.1.0

### Minor Changes

- feat: new CLI options and fix convertions issues ([`f430460`](https://github.com/JLAcostaEC/svgtosvelte/commit/f4304605dcdfc600b832aee012f82573a52a341d))

### Patch Changes

- fix: prevent test to be compiled at build time and improve linter ([`0d46dbd`](https://github.com/JLAcostaEC/svgtosvelte/commit/0d46dbd60243c7ac954b2bf27f644efc6b56bd9f))
