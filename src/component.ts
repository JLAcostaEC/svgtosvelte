import { SVG_CLOSE_TAG, SVG_OPEN_TAG } from "./regex.js";
import { svelteTsTemplate, svelteJsTemplate } from "./templates.js";
import { overrideAttributes } from "./attributes.js";
import type { AttributeOverride } from "./types.js";

/**
 * Converts an SVG string into a Svelte 5 component string using direct string manipulation.
 * Adds `{...attributes}` spread to the `<svg>` tag and `{@render children?.()}` before `</svg>`.
 */
export function createComponent(
  svgContent: string,
  useTypeScript: boolean,
  overrides: AttributeOverride[],
): string {
  let content = svgContent;

  if (overrides.length > 0) {
    content = overrideAttributes(content, overrides);
  }

  // Both tags are emitted lowercase on purpose: Svelte reads a capitalized tag
  // such as `<SVG>` as a component reference, not as an element.
  const closingTags = [...content.matchAll(SVG_CLOSE_TAG)];

  if (closingTags.length > 0) {
    // Normal `<svg>...</svg>`: render children right before the last closing
    // tag first, so its offsets stay valid, then add the spread to the opening tag.
    const lastClose = closingTags[closingTags.length - 1];
    content =
      content.slice(0, lastClose.index) +
      " {@render children?.()}\n</svg>" +
      content.slice(lastClose.index + lastClose[0].length);

    content = content.replace(SVG_OPEN_TAG, "<svg$1 {...attributes}>");
  } else {
    // Self-closing `<svg ... />` (or otherwise unclosed): normalize it so the
    // spread and children slot are still applied.
    content = content.replace(
      /<svg\b([^>]*?)\/?>/i,
      "<svg$1 {...attributes}> {@render children?.()}</svg>",
    );
  }

  const template = useTypeScript ? svelteTsTemplate : svelteJsTemplate;
  return template + content;
}
