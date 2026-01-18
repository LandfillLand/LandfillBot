import { promises as fs } from "fs";
import path from "path";

async function pruneDir(currentPath, removeSelf = false) {
  let entries;
  try {
    entries = await fs.readdir(currentPath, { withFileTypes: true });
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return true;
    }
    throw error;
  }

  let isEmpty = true;

  for (const entry of entries) {
    const childPath = path.join(currentPath, entry.name);

    if (entry.isDirectory()) {
      const childEmpty = await pruneDir(childPath, true);
      if (childEmpty) {
        await fs.rmdir(childPath).catch((err) => {
          if (!err || err.code !== "ENOENT") {
            throw err;
          }
        });
      } else {
        isEmpty = false;
      }
    } else {
      isEmpty = false;
    }
  }

  if (removeSelf && isEmpty) {
    await fs.rmdir(currentPath).catch((err) => {
      if (!err || err.code !== "ENOENT") {
        throw err;
      }
    });
  }

  return isEmpty;
}

async function main() {
  const targetArg = process.argv[2];
  const targetDir = targetArg ? path.resolve(process.cwd(), targetArg) : path.resolve(process.cwd(), "dist");
  await pruneDir(targetDir, false);
}

main().catch((error) => {
  console.error("Failed to remove empty directories:", error);
  process.exitCode = 1;
});
