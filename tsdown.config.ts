import { defineConfig } from "tsdown/config";
import pkg from "./package.json" with { type: "json" };

export default defineConfig({
  entry: ["src/index.ts", "bin.ts"],
  outDir: "dist",
  format: "esm",
  platform: "node",
  target: "node22",
  unbundle: true,
  fixedExtension: false,
  dts: true,
  clean: true,
  // Inject only the package fields the CLI needs, so the whole package.json is
  // not inlined into dist/bin.js.
  define: {
    __PKG_NAME__: JSON.stringify(pkg.name),
    __PKG_VERSION__: JSON.stringify(pkg.version),
    __PKG_DESCRIPTION__: JSON.stringify(pkg.description),
  },
});
