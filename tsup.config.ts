import { defineConfig } from "tsup";
import tsconfigPathsPluginModule from "@esbuild-plugins/tsconfig-paths";

const tsconfigPathsPlugin =
  typeof tsconfigPathsPluginModule === "function"
    ? tsconfigPathsPluginModule
    : (tsconfigPathsPluginModule as { default?: unknown }).default;

if (typeof tsconfigPathsPlugin !== "function") {
  throw new Error("Failed to load tsconfig-paths plugin for tsup");
}

export default defineConfig({
  entry: {
    "platforms/cloudflare": "src/platforms/cloudflare.ts",
    "platforms/deno": "src/platforms/deno.ts",
    "api/index": "api/index.ts"
  },
  format: ["esm"],
  target: "es2021",
  outDir: "dist",
  clean: true,
  dts: false,
  outExtension: () => ({ js: ".js" }),
  splitting: false,
  sourcemap: false,
  treeshake: false,
  minify: false,
  skipNodeModulesBundle: true,
  shims: false,
  platform: "neutral",
  esbuildPlugins: [tsconfigPathsPlugin({ tsconfig: "./tsconfig.json" })],
  onSuccess: "node scripts/remove-empty-dirs.mjs dist"
});
