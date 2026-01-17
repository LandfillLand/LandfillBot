import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const distEntry = path.join(distDir, "platforms", "netlify-edge.js");
const edgeFunctionsDir = path.join(distDir, "netlify", "edge-functions");
const targetFile = path.join(edgeFunctionsDir, "redirects.js");

async function ensureDistEntry() {
  let stat;
  try {
    stat = await fs.stat(distEntry);
  } catch (error) {
    throw new Error(`Missing dist output at ${distEntry}. Did you run \"npm run build\" first?`, { cause: error });
  }

  if (!stat.isFile()) {
    throw new Error(`Expected file but found something else at ${distEntry}`);
  }
}

async function ensureTargetDir() {
  await fs.mkdir(edgeFunctionsDir, { recursive: true });
}

async function copyBundle() {
  await fs.copyFile(distEntry, targetFile);
}

(async function prepare() {
  await ensureDistEntry();
  await ensureTargetDir();
  await copyBundle();
  console.info("Copied Netlify Edge bundle to", targetFile);
})().catch((error) => {
  console.error("Failed to prepare Netlify Edge output:", error);
  process.exitCode = 1;
});
