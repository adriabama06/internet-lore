import { readFile, readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import { dataDir, toPosix } from "./paths.mjs";

async function findEntryDirs(directory) {
  const found = [];

  for (const item of await readdir(directory, { withFileTypes: true })) {
    const fullPath = join(directory, item.name);

    if (item.isDirectory()) {
      found.push(...(await findEntryDirs(fullPath)));
    } else if (item.isFile() && item.name === "entry.json") {
      found.push(directory);
    }
  }

  return found;
}

/** @returns {Promise<Array<{ id: string, dir: string, entry: object }>>} */
export async function readEntries() {
  const records = [];

  for (const dir of await findEntryDirs(dataDir)) {
    records.push({
      id: toPosix(relative(dataDir, dir)),
      dir,
      entry: JSON.parse(await readFile(join(dir, "entry.json"), "utf8")),
    });
  }

  return records.sort((a, b) => a.id.localeCompare(b.id));
}

export async function readTags() {
  return JSON.parse(await readFile(join(dataDir, "tags.json"), "utf8"));
}
