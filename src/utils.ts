import type { AST } from 'svelte/compiler';

export type CasingFormat = 'camelCase' | 'PascalCase' | 'snake_case' | 'kebab-case';

export type Options = {
  prefix?: string;
  suffix?: string;
  casing: CasingFormat;
  useTypeScript?: boolean;
  /**
   * @deprecated Use -a (attributes) instead.
   */
  updatefwh?: boolean;
  attributes?: string[];
  filter?: string[];
  exclude?: string[];
  registry?: boolean;
  kit?: boolean;
};

export function overrideAttributes(text: string, overrides: { attr: string; value: string }[]) {
  // eslint-disable-next-line prefer-const
  for (let { attr, value } of overrides) {
    let tags = ['svg'];
    // If the attribute starts with *, it means it should be applied to all inner SVG elements
    if (attr.startsWith('*')) {
      tags = ['svg', 'path', 'circle', 'rect', 'g', 'line', 'polyline', 'polygon', 'ellipse'];
      attr = attr.slice(1);
    }

    const attrRegex = new RegExp(`(<(${tags.join('|')})\\b[^>]*?)\\s?${attr}="[^"]*"`, 'gi');

    // Replace if the attribute already exists
    text = text.replace(attrRegex, `$1 ${attr}="${value}"`);

    const tagRegex = new RegExp(`(<(${tags.join('|')})\\b(?![^>]*${attr}=))`, 'gi');

    // Add the attribute if it doesn't exist
    text = text.replace(tagRegex, `$1 ${attr}="${value}"`);
  }

  return text;
}

type Attributes = {
  test: (file: string) => boolean;
  attr: string;
  value: string;
};

export function mapFilesAttributes(files: string[], attributes: string[]) {
  if (attributes.length === 0) {
    return files.map((file) => ({
      file,
      overrides: []
    }));
  }

  const mappedAttributes: Attributes[] = [];

  for (const raw of attributes) {
    const parts = raw.split('.');

    // Support attr.value (empty pattern) and pattern.attr.value
    if (parts.length < 2 || parts.length > 3) continue;

    let pattern = '';
    let attr: string;
    let value: string;

    if (parts.length === 2) {
      // ".attr.value" ⇒ apply to all files
      [attr, value] = parts;
    } else {
      [pattern, attr, value] = parts;

      // Check if the user accidentally did "^.attr.value"
      if (pattern === '^') {
        pattern = '';
      }
    }

    let negate = false;

    if (pattern.startsWith('^')) {
      negate = true;
      pattern = pattern.slice(1);
    }

    const test =
      pattern === '' ? () => true : (file: string) => (negate ? !file.includes(pattern) : file.includes(pattern));

    mappedAttributes.push({ test, attr, value });
  }

  const result: {
    file: string;
    overrides: { attr: string; value: string }[];
  }[] = [];

  for (const file of files) {
    const applicable = mappedAttributes
      .filter((o) => {
        return o.test(file);
      })
      .map(({ attr, value }) => ({ attr, value }));

    result.push({ file, overrides: applicable });
  }

  return result;
}

/**
 * @deprecated Now just simply do `${attribute}="${value}" ` <- with an space at the end
 */
export function parseAttribute(
  attribute: AST.Attribute,
  /** Whether to update fill, width, and height attributes to make the SVG responsive and inherit the current color */
  updatefwh: boolean
) {
  if (updatefwh) {
    if (attribute.name === 'fill' || attribute.name === 'stroke') {
      return `${attribute.name}="currentColor" `;
    }
    if (attribute.name === 'width') return `width="100%" `;
    if (attribute.name === 'height') return `height="auto" `;
  }

  return `${attribute.name}="${attribute.value[0].data}" `;
}

export function convertCasing(text: string, format: CasingFormat) {
  const words = text
    .replace(/([a-z])([A-Z])/g, '$1 $2') // Split camelCase/PascalCase text
    .replace(/([0-9])([a-zA-Z])/g, '$1 $2') // Split numbers from text
    .replace(/[^a-zA-Z0-9]+/g, ' ') // Replace non-alphanumeric characters with spaces
    .trim()
    .toLowerCase()
    .split(/\s+/);

  switch (format) {
    case 'camelCase':
      return words.map((word, index) => (index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1))).join('');
    case 'PascalCase':
      return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join('');
    case 'snake_case':
      return words.join('_');
    case 'kebab-case':
      return words.join('-');
    default:
      throw new Error(`Unknow casing format: ${format}`);
  }
}

export function getCleanName(input: string, glossary: string[]): string {
  // Remove glossary words (case insensitive)
  let result = glossary.reduce((result, word) => result.replace(word, ''), input);

  // Remove symbols (like hyphens, dots, etc.)
  result = result
    .replace(/[^\w\s]|_/g, ' ')
    // Remove extra spaces
    .replace(/\s+/g, ' ')
    .trim()
    // Remove the file extension
    .replace(/\.[a-zA-Z]+$/, '')
    // Capitalize the remaining text
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) // Capitalize the first letter of each word
    .join(' ');

  return result.trim();
}

export const svelteTsTemplate = `<script lang="ts">import type { SVGAttributes } from 'svelte/elements';let { children, ...attributes }: SVGAttributes<SVGElement> = $props();</script>`;

export const svelteJsTemplate = `<script>/** @type {import('svelte/elements').SVGAttributes<SVGElement>} */ let { children, ...attributes } = $props();</script>`;
