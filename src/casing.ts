import type { CasingFormat } from "./types.js";

export function convertCasing(text: string, format: CasingFormat): string {
  const words = text
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([0-9])([a-zA-Z])/g, "$1 $2")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase()
    .split(/\s+/);

  let result: string;

  switch (format) {
    case "camelCase":
      result = words.map((w, i) => (i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1))).join("");
      break;
    case "PascalCase":
      result = words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("");
      break;
    case "snake_case":
      result = words.join("_");
      break;
    case "kebab-case":
      result = words.join("-");
      break;
    default:
      throw new Error(`Unknown casing format: ${format}`);
  }

  return result;
}

/**
 * Ensures a PascalCase name is a valid JavaScript identifier so it can be used
 * as an `export` binding. Names that start with a digit (e.g. `24Circle`, from
 * an icon like `24-circle.svg`) are not valid identifiers, so they are prefixed
 * with `Icon`. Empty names become `Icon`.
 */
export function toSafeIdentifier(name: string): string {
  if (name.length === 0) return "Icon";
  return /^[0-9]/.test(name) ? `Icon${name}` : name;
}

export function getCleanName(input: string, glossary: string[]): string {
  // Remove every occurrence of each glossary word (not just the first).
  let result = glossary.reduce((r, word) => (word ? r.split(word).join("") : r), input);

  result = result
    .replace(/[^\w\s]|_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");

  return result.trim();
}
