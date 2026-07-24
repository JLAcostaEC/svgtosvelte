import fs from "node:fs/promises";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import {
  convertCasing,
  toSafeIdentifier,
  getCleanName,
  overrideAttributes,
  mapFilesAttributes,
  createComponent,
  svgsToSvelte,
  silentLogger,
  type Logger,
} from "../src/index.js";

const SVG = '<svg width="24" height="24"><path d="M0 0h24v24H0z" fill="#000" /></svg>';
const TMP = "test/.tmp";

afterAll(async () => {
  await fs.rm(TMP, { recursive: true, force: true });
});

async function writeIcons(dir: string, files: Record<string, string>): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
  await Promise.all(
    Object.entries(files).map(([name, content]) =>
      fs.writeFile(path.join(dir, name), content, "utf8"),
    ),
  );
}

function captureLogger(): { logger: Logger; warnings: string[] } {
  const warnings: string[] = [];
  return { logger: { ...silentLogger, warn: (m) => warnings.push(m) }, warnings };
}

// ── convertCasing / toSafeIdentifier ───────────────────

describe("convertCasing", () => {
  it("normalizes separators to PascalCase", () => {
    expect(convertCasing("add-circle", "PascalCase")).toBe("AddCircle");
  });

  it("supports camelCase, snake_case and kebab-case", () => {
    expect(convertCasing("add_circle", "camelCase")).toBe("addCircle");
    expect(convertCasing("AddCircle", "snake_case")).toBe("add_circle");
    expect(convertCasing("AddCircle", "kebab-case")).toBe("add-circle");
  });

  it("collapses different separators to the same name", () => {
    expect(convertCasing("add-circle", "PascalCase")).toBe(
      convertCasing("add_circle", "PascalCase"),
    );
  });
});

describe("toSafeIdentifier", () => {
  it("prefixes names that start with a digit", () => {
    expect(toSafeIdentifier("24Circle")).toBe("Icon24Circle");
    expect(toSafeIdentifier("3DCube")).toBe("Icon3DCube");
  });

  it("leaves valid identifiers untouched and handles empties", () => {
    expect(toSafeIdentifier("AddCircle")).toBe("AddCircle");
    expect(toSafeIdentifier("")).toBe("Icon");
  });

  it("always yields a valid JS identifier", () => {
    const id = toSafeIdentifier(convertCasing("24-circle", "PascalCase"));
    expect(/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(id)).toBe(true);
  });
});

// ── getCleanName ───────────────────────────────────────

describe("getCleanName", () => {
  it("removes every occurrence of a glossary word, not just the first", () => {
    expect(getCleanName("fluent_24_add_24_filled", ["24"])).not.toMatch(/24/);
  });

  it("is a no-op when the word is absent", () => {
    expect(getCleanName("add_circle", ["24"])).toBe("Add Circle");
  });
});

// ── overrideAttributes ─────────────────────────────────

describe("overrideAttributes", () => {
  it("replaces an existing attribute value", () => {
    const out = overrideAttributes('<svg fill="#000"></svg>', [
      { attr: "fill", value: "currentColor" },
    ]);
    expect(out).toContain('fill="currentColor"');
    expect(out).not.toContain('fill="#000"');
  });

  it("adds the attribute when missing", () => {
    const out = overrideAttributes("<svg></svg>", [{ attr: "fill", value: "currentColor" }]);
    expect(out).toContain('fill="currentColor"');
  });

  it("does not treat $ in the value as a replacement pattern", () => {
    const out = overrideAttributes('<svg fill="x"></svg>', [{ attr: "fill", value: "a$1b" }]);
    expect(out).toContain('fill="a$1b"');
  });

  it("applies a * wildcard to every known SVG tag", () => {
    const out = overrideAttributes("<svg><path /></svg>", [{ attr: "*fill", value: "red" }]);
    expect(out).toContain('<svg fill="red">');
    expect(out).toContain('<path fill="red"');
  });
});

// ── mapFilesAttributes ─────────────────────────────────

describe("mapFilesAttributes", () => {
  it("parses the legacy attr.value format", () => {
    const [r] = mapFilesAttributes(["a.svg"], ["fill.currentColor"]);
    expect(r.overrides).toEqual([{ attr: "fill", value: "currentColor" }]);
  });

  it("supports = so the value can contain dots", () => {
    const [r] = mapFilesAttributes(["a.svg"], ["opacity=0.5"]);
    expect(r.overrides).toEqual([{ attr: "opacity", value: "0.5" }]);
  });

  it("applies pattern.attr.value only to matching files", () => {
    const [server, home] = mapFilesAttributes(["server.svg", "home.svg"], ["server.fill.red"]);
    expect(server.overrides).toHaveLength(1);
    expect(home.overrides).toHaveLength(0);
  });

  it("negates with ^pattern", () => {
    const [server, home] = mapFilesAttributes(["server.svg", "home.svg"], ["^server.fill.red"]);
    expect(server.overrides).toHaveLength(0);
    expect(home.overrides).toHaveLength(1);
  });

  it("warns and ignores malformed tokens instead of failing silently", () => {
    const { logger, warnings } = captureLogger();
    const [r] = mapFilesAttributes(["a.svg"], ["bogus"], logger);
    expect(r.overrides).toEqual([]);
    expect(warnings).toHaveLength(1);
  });
});

// ── createComponent ────────────────────────────────────

describe("createComponent", () => {
  it("injects the spread and children slot into a normal svg", () => {
    const out = createComponent("<svg></svg>", true, []);
    expect(out).toContain("{...attributes}");
    expect(out).toContain("{@render children?.()}");
  });

  it("handles a self-closing <svg /> without producing broken markup", () => {
    const out = createComponent('<svg width="24" />', true, []);
    expect(out).toContain("{...attributes}");
    expect(out).toContain("{@render children?.()}");
    expect(out).toContain("</svg>");
    expect(out).not.toMatch(/\/\s*\{\.\.\.attributes\}/);
  });

  it("uses the TS template vs the JS template", () => {
    expect(createComponent("<svg></svg>", true, [])).toContain('lang="ts"');
    expect(createComponent("<svg></svg>", false, [])).toContain("@type");
  });
});

// ── svgsToSvelte ───────────────────────────────────────

describe("svgsToSvelte", () => {
  it("sanitizes digit-leading names into a valid export", async () => {
    const src = `${TMP}/digit-src`;
    const out = `${TMP}/digit-out`;
    await writeIcons(src, { "24-circle.svg": SVG });

    const result = await svgsToSvelte(src, out, { casing: "PascalCase" }, silentLogger);

    expect(result.components[0]?.componentName).toBe("Icon24Circle");
    const index = await fs.readFile(path.join(out, "index.js"), "utf8");
    expect(index).toContain("export { default as Icon24Circle }");
  });

  it("detects collisions and skips the duplicate", async () => {
    const src = `${TMP}/col-src`;
    const out = `${TMP}/col-out`;
    await writeIcons(src, { "add-circle.svg": SVG, "add_circle.svg": SVG });

    const result = await svgsToSvelte(src, out, { casing: "PascalCase" }, silentLogger);

    expect(result.components).toHaveLength(1);
    expect(result.skipped.some((s) => s.reason === "collision")).toBe(true);
  });

  it("writes nothing on dry-run", async () => {
    const src = `${TMP}/dry-src`;
    const out = `${TMP}/dry-out`;
    await writeIcons(src, { "home.svg": SVG });

    const result = await svgsToSvelte(
      src,
      out,
      { casing: "PascalCase", dryRun: true },
      silentLogger,
    );

    expect(result.components).toHaveLength(1);
    await expect(fs.access(out)).rejects.toThrow();
  });

  it("does not duplicate exports across re-runs", async () => {
    const src = `${TMP}/rerun-src`;
    const out = `${TMP}/rerun-out`;
    await writeIcons(src, { "home.svg": SVG, "user.svg": SVG });

    await svgsToSvelte(src, out, { casing: "PascalCase" }, silentLogger);
    await svgsToSvelte(src, out, { casing: "PascalCase", force: true }, silentLogger);

    const index = await fs.readFile(path.join(out, "index.js"), "utf8");
    const homeExports = index.match(/export \{ default as Home \}/g) ?? [];
    expect(homeExports).toHaveLength(1);
  });

  it("merges the registry without duplicates across re-runs", async () => {
    const src = `${TMP}/reg-src`;
    const out = `${TMP}/reg-out`;
    await writeIcons(src, { "home.svg": SVG, "user.svg": SVG });

    await svgsToSvelte(src, out, { casing: "PascalCase", registry: true }, silentLogger);
    await svgsToSvelte(
      src,
      out,
      { casing: "PascalCase", registry: true, force: true },
      silentLogger,
    );

    const registry = JSON.parse(await fs.readFile(path.join(out, "registry.json"), "utf8"));
    const names = registry.map((e: { componentName: string }) => e.componentName);
    expect(names).toHaveLength(2);
    expect(new Set(names).size).toBe(2);
  });

  it("throws (instead of exiting) when the source does not exist", async () => {
    await expect(
      svgsToSvelte(`${TMP}/does-not-exist`, `${TMP}/x`, { casing: "PascalCase" }, silentLogger),
    ).rejects.toThrow(/does not exist/);
  });

  it("throws on an invalid casing value", async () => {
    const src = `${TMP}/casing-src`;
    await writeIcons(src, { "home.svg": SVG });
    await expect(
      // @ts-expect-error testing an invalid runtime value
      svgsToSvelte(src, `${TMP}/casing-out`, { casing: "bogus" }, silentLogger),
    ).rejects.toThrow(/Invalid casing/);
  });
});
