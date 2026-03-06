import { SVG_ELEMENT_TAGS } from './regex.js';
import type { AttributeOverride, FileWithOverrides } from './types.js';

/**
 * Overrides or adds attributes on SVG elements.
 * Prefix attr with `*` to apply to all known SVG element tags.
 */
export function overrideAttributes(text: string, overrides: AttributeOverride[]): string {
  // eslint-disable-next-line prefer-const
  for (let { attr, value } of overrides) {
    let tags = ['svg'];

    if (attr.startsWith('*')) {
      tags = SVG_ELEMENT_TAGS;
      attr = attr.slice(1);
    }

    const tagsPattern = tags.join('|');

    // Replace existing attribute value
    const attrRegex = new RegExp(`(<(${tagsPattern})\\b[^>]*?)\\s?${attr}="[^"]*"`, 'gi');
    text = text.replace(attrRegex, `$1 ${attr}="${value}"`);

    // Add attribute if it doesn't exist on the tag
    const tagRegex = new RegExp(`(<(${tagsPattern})\\b(?![^>]*${attr}=))`, 'gi');
    text = text.replace(tagRegex, `$1 ${attr}="${value}"`);
  }

  return text;
}

type AttributeMapping = {
  test: (file: string) => boolean;
  attr: string;
  value: string;
};

/**
 * Maps files to their applicable attribute overrides based on pattern matching.
 *
 * Attribute format: `[pattern.]attr.value`
 * - `attr.value` → applies to all files
 * - `pattern.attr.value` → applies to files containing `pattern`
 * - `^pattern.attr.value` → applies to files NOT containing `pattern`
 */
export function mapFilesAttributes(files: string[], attributes: string[]): FileWithOverrides[] {
  if (attributes.length === 0) {
    return files.map((file) => ({ file, overrides: [] }));
  }

  const mappings: AttributeMapping[] = [];

  for (const raw of attributes) {
    const parts = raw.split('.');

    if (parts.length < 2 || parts.length > 3) continue;

    let pattern: string;
    let attr: string;
    let value: string;

    if (parts.length === 2) {
      pattern = '';
      [attr, value] = parts;
    } else {
      [pattern, attr, value] = parts;
      if (pattern === '^') pattern = '';
    }

    let negate = false;
    if (pattern.startsWith('^')) {
      negate = true;
      pattern = pattern.slice(1);
    }

    const test =
      pattern === '' ? () => true : (file: string) => (negate ? !file.includes(pattern) : file.includes(pattern));

    mappings.push({ test, attr, value });
  }

  return files.map((file) => ({
    file,
    overrides: mappings.filter((m) => m.test(file)).map(({ attr, value }) => ({ attr, value }))
  }));
}
