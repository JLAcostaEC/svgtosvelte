import type { AST } from "svelte/compiler";

export type CasingFormat = 'camelCase' | 'PascalCase' | 'snake_case' | 'kebab-case';

export function parseAttribute(
  attribute: AST.Attribute,
  /** Whether to update fill, width, and height attributes to make the SVG responsive and inherit the current color */
  updatefwh = false
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
    .replace(/[^a-zA-Z0-9]+/g, ' ')      // Replace non-alphanumeric characters with spaces
    .trim()                              // Remove leading/trailing spaces
    .toLowerCase()
    .split(/\s+/);

  switch (format) {
    case 'camelCase':
      return words
        .map((word, index) =>
          index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)
        )
        .join('');
    case 'PascalCase':
      return words
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join('');
    case 'snake_case':
      return words.join('_');
    case 'kebab-case':
      return words.join('-');
    default:
      throw new Error(`Unknow casing format: ${format}`);
  }
}

export const svelteTsTemplate = `<script lang="ts">import type { SVGAttributes } from 'svelte/elements';let { children, ...attributes }: SVGAttributes<SVGElement> = $props();</script>`

export const svelteJsTemplate = `<script>let { children, ...attributes } = $$props;</script>`