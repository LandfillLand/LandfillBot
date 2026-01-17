import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const edgeEntry = path.join(distDir, "api", "index.js");
const outputDir = path.join(rootDir, ".vercel", "output");
const functionsDir = path.join(outputDir, "functions", "api");
const functionBundleDir = path.join(functionsDir, "index.func");
const functionEntry = path.join(functionBundleDir, "index.js");
const functionConfig = path.join(functionBundleDir, ".vc-config.json");
const configFile = path.join(outputDir, "config.json");

async function ensureDistEntry() {
  try {
    const stat = await fs.stat(edgeEntry);
    if (!stat.isFile()) {
      throw new Error(`Expected file but found something else at ${edgeEntry}`);
    }
  } catch (error) {
    throw new Error(`Missing dist output at ${edgeEntry}. Did you run \"npm run build\" first?`, { cause: error });
  }
}

async function cleanOutputDir() {
  await fs.rm(outputDir, { recursive: true, force: true });
  await fs.mkdir(functionBundleDir, { recursive: true });
}

async function writeFunctionBundle() {
  await fs.copyFile(edgeEntry, functionEntry);
  const config = {
    runtime: "edge",
    entrypoint: "index.js"
  };
  await fs.writeFile(functionConfig, JSON.stringify(config, null, 2));
}

async function writeConfig() {
  const config = {
    version: 3,
    routes: [
      {
        src: "/(.*)",
        dest: "api/index"
      }
    ]
  };
  await fs.writeFile(configFile, JSON.stringify(config, null, 2));
}

(async function prepare() {
  await ensureDistEntry();
  await cleanOutputDir();
  await writeFunctionBundle();
  await writeConfig();
  console.info("Prepared Vercel Build Output API bundle at", outputDir);
})().catch((error) => {
  console.error("Failed to prepare Vercel output:", error);
  process.exitCode = 1;
});
