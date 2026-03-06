import { SVG_OPEN_TAG } from './regex.js';
import { svelteTsTemplate, svelteJsTemplate } from './templates.js';
import { overrideAttributes } from './attributes.js';
import type { AttributeOverride } from './types.js';

/**
 * Converts an SVG string into a Svelte 5 component string using direct string manipulation.
 * Adds `{...attributes}` spread to the `<svg>` tag and `{@render children?.()}` before `</svg>`.
 */
export function createComponent(svgContent: string, useTypeScript: boolean, overrides: AttributeOverride[]): string {
  let content = svgContent;

  if (overrides.length > 0) {
    content = overrideAttributes(content, overrides);
  }

  // Add {...attributes} spread to <svg> tag
  content = content.replace(SVG_OPEN_TAG, '<svg$1 {...attributes}>');

  // Insert {@render children?.()} before last </svg>
  const lastClose = content.lastIndexOf('</svg>');
  if (lastClose !== -1) {
    content = content.slice(0, lastClose) + ' {@render children?.()}\n' + content.slice(lastClose);
  }

  const template = useTypeScript ? svelteTsTemplate : svelteJsTemplate;
  return template + content;
}
