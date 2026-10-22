import { dirname, join, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const dataDir = join(repoRoot, "data");
export const publicDir = join(repoRoot, "public");

export function toPosix(path) {
  return path.split(sep).join("/");
}
