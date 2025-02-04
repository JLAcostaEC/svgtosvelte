# SVG to Svelte

`svgtosvelte` is the Best Way to Convert SVG to Svelte 5 Components

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- [Options](#options)
- [Examples](#examples)
- [License](#license)

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

## Examples:

Convert SVG files in the icons directory to Svelte components in the src/lib directory:

```sh
svgtosvelte icons
```

Convert SVG files with a prefix and suffix:

```sh
svgtosvelte icons src/lib -p Icon -s Component
```

Convert SVG files with camelCase naming and TypeScript:

```sh
svgtosvelte icons src/lib -c camelCase -t
```

## API

You can also use the package programmatically:

```ts
convertSvgToSvelte(source: string, outDir: string, options: { prefix: string, suffix: string, casing: CasingFormat, useTypeScript: boolean }): void
```

### Parameters

- `source: string`: The folder containing all the SVG files to be converted.
- `outDir: string`: Destination folder for all created Svelte files.
- `option.prefix: string`: The name appended to the beginning of each component name.
- `option.suffix: string`: The name appended to the end of each component name.
- `option.casing: string`: Convert all components name to the given casing. (PascalCase, camelCase, kebab-case, snake_case)
- `option.useTypeScript: boolean`: Whether to use TS for file types or not.

### Example

```javascript
import { convertSvgToSvelte } from 'svgtosvelte';

convertSvgToSvelte('src/assets/', 'src/lib/', {
  prefix: 'Svg2Svelte',
  suffix: 'byAuthor',
  casing: 'PascalCase',
  useTypeScript: true
});
```

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE.md) file for details.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any changes.

## Contact

For any questions or feedback, please [contact me here](https://jorgelacosta.com).
