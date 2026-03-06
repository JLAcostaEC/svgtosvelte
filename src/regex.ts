/** Matches the opening `<svg ...>` tag, capturing inner attributes */
export const SVG_OPEN_TAG = /<svg\b([^>]*)>/i;

/** SVG element tags used for wildcard (*) attribute overrides */
export const SVG_ELEMENT_TAGS = ['svg', 'path', 'circle', 'rect', 'g', 'line', 'polyline', 'polygon', 'ellipse'];
