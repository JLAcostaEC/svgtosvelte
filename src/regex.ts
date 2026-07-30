/** Matches the opening `<svg ...>` tag, capturing inner attributes */
export const SVG_OPEN_TAG = /<svg\b([^>]*)>/i;

/**
 * Matches a closing `</svg>` tag in any casing, tolerating trailing whitespace
 * (`</svg >` is valid XML). Global so every occurrence can be located.
 */
export const SVG_CLOSE_TAG = /<\/svg\s*>/gi;

/** SVG element tags used for wildcard (*) attribute overrides */
export const SVG_ELEMENT_TAGS = [
  "svg",
  "path",
  "circle",
  "rect",
  "g",
  "line",
  "polyline",
  "polygon",
  "ellipse",
];
