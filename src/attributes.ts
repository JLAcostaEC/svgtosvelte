import { SVG_ELEMENT_TAGS } from "./regex.js";
import { silentLogger } from "./logger.js";
import type { AttributeOverride, FileWithOverrides, Logger } from "./types.js";

/** Escapes a string so it can be embedded literally inside a `RegExp`. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Escapes `$` so it is not interpreted as a replacement pattern by `String.replace`. */
function escapeReplacement(value: string): string {
  return value.replace(/\$/g, "$$$$");
}

/**
 * Overrides or adds attributes on SVG elements.
 * Prefix attr with `*` to apply to all known SVG element tags.
 */
export function overrideAttributes(text: string, overrides: AttributeOverride[]): string {
  for (let { attr, value } of overrides) {
    let tags = ["svg"];

    if (attr.startsWith("*")) {
      tags = SVG_ELEMENT_TAGS;
      attr = attr.slice(1);
    }

    const tagsPattern = tags.join("|");
    const safeAttr = escapeRegExp(attr);
    const safeValue = escapeReplacement(value);

    // Replace an existing attribute value. The leading `\s` is required so the
    // name matches as a whole: `fill` must not match `data-fill`. Both quote
    // styles are accepted (SVG is XML, so the value is always quoted).
    const attrRegex = new RegExp(
      `(<(?:${tagsPattern})\\b[^>]*?)\\s${safeAttr}\\s*=\\s*(?:"[^"]*"|'[^']*')`,
      "gi",
    );
    text = text.replace(attrRegex, `$1 ${attr}="${safeValue}"`);

    // Add the attribute when the tag doesn't already carry it.
    const tagRegex = new RegExp(`(<(?:${tagsPattern})\\b)(?![^>]*\\s${safeAttr}\\s*=)`, "gi");
    text = text.replace(tagRegex, `$1 ${attr}="${safeValue}"`);
  }

  return text;
}

type AttributeMapping = {
  test: (file: string) => boolean;
  attr: string;
  value: string;
};

/**
 * Parses a single attribute token.
 *
 * Accepted formats:
 * - `attr.value` / `pattern.attr.value` — legacy dot format (value cannot contain dots).
 * - `attr=value` / `pattern.attr=value` — use `=` when the value contains dots
 *   (e.g. `opacity=0.5`, `transform=scale(1.5)`).
 *
 * Returns `null` when the token is malformed.
 */
function parseAttributeToken(raw: string): { pattern: string; attr: string; value: string } | null {
  let pattern = "";
  let attr: string | undefined;
  let value: string | undefined;

  const eq = raw.indexOf("=");
  if (eq !== -1) {
    const selector = raw.slice(0, eq);
    value = raw.slice(eq + 1);
    const dot = selector.lastIndexOf(".");
    if (dot !== -1) {
      pattern = selector.slice(0, dot);
      attr = selector.slice(dot + 1);
    } else {
      attr = selector;
    }
  } else {
    const parts = raw.split(".");
    if (parts.length === 2) {
      [attr, value] = parts;
    } else if (parts.length === 3) {
      [pattern, attr, value] = parts;
    } else {
      return null;
    }
  }

  if (!attr || !value) return null;
  return { pattern, attr, value };
}

/**
 * Maps files to their applicable attribute overrides based on pattern matching.
 *
 * - `attr.value` / `attr=value` → applies to all files
 * - `pattern.attr.value` → applies to files containing `pattern`
 * - `^pattern.attr.value` → applies to files NOT containing `pattern`
 */
export function mapFilesAttributes(
  files: string[],
  attributes: string[],
  logger: Logger = silentLogger,
): FileWithOverrides[] {
  if (attributes.length === 0) {
    return files.map((file) => ({ file, overrides: [] }));
  }

  const mappings: AttributeMapping[] = [];

  for (const raw of attributes) {
    const parsed = parseAttributeToken(raw);

    if (!parsed) {
      logger.warn(
        `Ignoring malformed attribute "${raw}". Use "attr.value", "pattern.attr.value", ` +
          `or "attr=value" (use "=" when the value contains dots).`,
      );
      continue;
    }

    let { pattern } = parsed;
    const { attr, value } = parsed;

    if (pattern === "^") pattern = "";

    let negate = false;
    if (pattern.startsWith("^")) {
      negate = true;
      pattern = pattern.slice(1);
    }

    const test =
      pattern === ""
        ? () => true
        : (file: string) => (negate ? !file.includes(pattern) : file.includes(pattern));

    mappings.push({ test, attr, value });
  }

  return files.map((file) => ({
    file,
    overrides: mappings.filter((m) => m.test(file)).map(({ attr, value }) => ({ attr, value })),
  }));
}
