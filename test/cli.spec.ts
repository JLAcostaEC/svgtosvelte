import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const pkg = require("../package.json") as { version: string };

const BIN = path.resolve("dist/bin.js");
const TMP = "test/.cli-tmp";
const SVG = '<svg width="24" height="24"><path d="M0 0h24v24H0z" fill="#000" /></svg>';

function runCli(args: string[]) {
  return spawnSync(process.execPath, [BIN, ...args], { encoding: "utf8" });
}

async function writeIcons(dir: string, names: string[]): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
  await Promise.all(names.map((name) => fs.writeFile(path.join(dir, name), SVG, "utf8")));
}

beforeAll(() => {
  // Build dist/bin.js so the version is injected via tsdown's `define`.
  let tsdownBin = "";
  try {
    tsdownBin = path.join(path.dirname(require.resolve("tsdown/package.json")), "dist/run.mjs");
  } catch {
    tsdownBin = "";
  }

  if (tsdownBin && existsSync(tsdownBin)) {
    const res = spawnSync(process.execPath, [tsdownBin], { encoding: "utf8" });
    if (res.status !== 0) {
      throw new Error(`tsdown build failed:\n${res.stdout}\n${res.stderr}`);
    }
  }

  if (!existsSync(BIN)) {
    throw new Error(`CLI not built at ${BIN}. Run "pnpm build" first.`);
  }
}, 120000);

afterAll(async () => {
  await fs.rm(TMP, { recursive: true, force: true });
});

describe("CLI", () => {
  it("prints the version", () => {
    const { stdout, status } = runCli(["--version"]);
    expect(status).toBe(0);
    expect(stdout.trim()).toBe(pkg.version);
  });

  it("prints help with the documented options", () => {
    const { stdout, status } = runCli(["--help"]);
    expect(status).toBe(0);
    expect(stdout).toContain("Usage:");
    for (const flag of ["--prefix", "--casing", "--registry", "--dry-run", "--force"]) {
      expect(stdout).toContain(flag);
    }
    expect(stdout).not.toContain("--check");
  });

  it("converts a directory and writes components + index", async () => {
    const src = `${TMP}/src`;
    const out = `${TMP}/out`;
    await writeIcons(src, ["home.svg", "user.svg"]);

    const { stdout, status } = runCli([src, out]);
    expect(status).toBe(0);
    expect(stdout).toContain("completed successfully");

    const files = await fs.readdir(out);
    expect(files).toContain("index.js");
    expect(files).toContain("Home.svelte");
    expect(files).toContain("User.svelte");
  });

  it("writes TypeScript components and a registry with -t -r", async () => {
    const src = `${TMP}/ts-src`;
    const out = `${TMP}/ts-out`;
    await writeIcons(src, ["home.svg"]);

    const { status } = runCli([src, out, "-t", "-r"]);
    expect(status).toBe(0);

    const files = await fs.readdir(out);
    expect(files).toContain("index.ts");
    expect(files).toContain("registry.json");
  });

  it("writes nothing on --dry-run", async () => {
    const src = `${TMP}/dry-src`;
    const out = `${TMP}/dry-out`;
    await writeIcons(src, ["home.svg"]);

    const { stdout, status } = runCli([src, out, "--dry-run"]);
    expect(status).toBe(0);
    expect(stdout).toContain("Dry run complete");
    expect(existsSync(out)).toBe(false);
  });

  it("applies a prefix to component names", async () => {
    const src = `${TMP}/pre-src`;
    const out = `${TMP}/pre-out`;
    await writeIcons(src, ["home.svg"]);

    const { status } = runCli([src, out, "-p", "icon"]);
    expect(status).toBe(0);

    const index = await fs.readFile(path.join(out, "index.js"), "utf8");
    expect(index).toContain("IconHome");
  });

  it("exits non-zero on an invalid casing", async () => {
    const src = `${TMP}/casing-src`;
    await writeIcons(src, ["home.svg"]);

    const { status, stderr } = runCli([src, `${TMP}/casing-out`, "-c", "bogus"]);
    expect(status).not.toBe(0);
    expect(stderr).toContain("Allowed choices");
  });

  it("exits with code 1 when the source does not exist", () => {
    const { status, stderr } = runCli([`${TMP}/missing`, `${TMP}/x`]);
    expect(status).toBe(1);
    expect(stderr).toContain("does not exist");
  });
});
