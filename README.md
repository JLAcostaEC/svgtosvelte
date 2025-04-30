# SVG to Svelte

`svgtosvelte` is the Best Way to Convert SVG to Svelte 5 Components

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- [Options](#options)
- [Examples](#examples)
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
- `-c, --casing <casing>`: Set casing for component names (default: PascalCase).
- `-t, --typescript`: Use TypeScript in generated components (default: false).
- `-a, --attributes`: Add/Override SVG attributes on demand (default []).
- `-f, --filter`: Filter icons with specific words out of selection (default: [])
- `-e, --exclude`: Exclude specific words from the icon/component name (default: [])
- `-r, --registry`: Create a JSON object detailing each component info (default: false)
- `-k, --kit`: Tell the CLI that you’re using SvelteKit, which will prevent errors caused by using the word “server” in `src/lib` by moving all icons to `src/lib/icons` folder.

## Examples:

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

## API

You can also use the package programmatically:

```ts
import { convertSvgsToSvelte } from '@jlacostaec/svgtosvelte';

convertSvgsToSvelte(source: string, outDir: string, options: Options): void
```

### Parameters

- `source: string`: The folder containing all the SVG files to be converted.
- `outDir: string`: Destination folder for all created Svelte files.
- `option.prefix: string`: The name appended to the beginning of each component name.
- `option.suffix: string`: The name appended to the end of each component name.
- `option.casing: string`: Convert all components name to the given casing. (PascalCase, camelCase, kebab-case, snake_case)
- `option.useTypeScript: boolean`: Whether to use TS for file types or not.
- `option.attributes: string[]`: Add/Override SVG attributes on demand (default []).
- `option.filter: string[]`: Filter icons with specific words out of selection (default: [])
- `option.exclude: string[]`: Exclude specific words from the icon/component name (default: [])
- `option.registry: boolean`: Create a JSON object detailing each component info (default: false)
- `option.kit: boolean`: Tell the CLI that you’re using SvelteKit, which will prevent errors caused by using the word “server” in `src/lib`.

### Example

```javascript
import { convertSvgsToSvelte } from '@jlacostaec/svgtosvelte';

convertSvgsToSvelte('src/path-to-svgs-folder/', 'src/lib/', {
  prefix: 'Svg2Svelte',
  suffix: 'byAuthor',
  casing: 'PascalCase',
  useTypeScript: true,
  updatefwh: false,
  filter: [],
  exclude: ['2'],
  registry: true,
  kit: true
});
```

```
Output files

-> src/lib/
    -------------------
      /icons/
        IconsWithTheWordSERVER.svelte

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
