import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { cleanPublishedAssets } from "./assets.mjs";
import { ICON_SIZE, buildEdges, buildNodes } from "./graph.mjs";
import { layoutGraph } from "./layout/index.mjs";
import { publicDir } from "./paths.mjs";
import { readEntries, readTags } from "./readEntries.mjs";

async function main() {
  const records = await readEntries();
  await cleanPublishedAssets();

  const nodes = await buildNodes(records);
  const edges = buildEdges(records);
  layoutGraph(nodes, edges);

  const usedTags = new Set(nodes.flatMap((node) => node.tags));
  const tags = (await readTags()).filter((tag) => usedTags.has(tag));

  await mkdir(publicDir, { recursive: true });
  await writeFile(
    join(publicDir, "graph.json"),
    JSON.stringify({ iconSize: ICON_SIZE, tags, nodes, edges }),
  );

  console.log(`Built graph: ${nodes.length} nodes, ${edges.length} edges.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
