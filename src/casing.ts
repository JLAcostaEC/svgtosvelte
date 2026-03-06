import type { CasingFormat } from './types.js';

export function convertCasing(text: string, format: CasingFormat): string {
  const words = text
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([0-9])([a-zA-Z])/g, '$1 $2')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLowerCase()
    .split(/\s+/);

  let result: string;

  switch (format) {
    case 'camelCase':
      result = words.map((w, i) => (i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1))).join('');
      break;
    case 'PascalCase':
      result = words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('');
      break;
    case 'snake_case':
      result = words.join('_');
      break;
    case 'kebab-case':
      result = words.join('-');
      break;
    default:
      throw new Error(`Unknown casing format: ${format}`);
  }

  return result;
}

export function getCleanName(input: string, glossary: string[]): string {
  let result = glossary.reduce((r, word) => r.replace(word, ''), input);

  result = result
    .replace(/[^\w\s]|_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\.[a-zA-Z]+$/, '')
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');

  return result.trim();
}
