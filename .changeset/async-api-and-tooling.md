---
"@jlacostaec/svgtosvelte": major
---

breaking: Async API, correctness fixes, and tooling migration.

**Breaking**

- `svgsToSvelte` is now async and returns a structured `Promise<ConvertResult>` (`components`, `skipped`, `indexPath`, `registryPath`). `await` it.
- The library no longer writes to the console or calls `process.exit`; it throws on errors and accepts an optional `logger` (a ready-made `consoleLogger` is exported). The CLI passes `consoleLogger` and maps errors to a non-zero exit code.
- `svelte-check` integration is removed. Conversions no longer run `svelte-check`, and the package no longer declares `svelte` or `svelte-check` as dependencies of any kind. Validate the generated components from your own project instead.

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
