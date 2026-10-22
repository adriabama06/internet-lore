import { sortKey, yearOf } from "../shared/dates.mjs";
import { publishAssets } from "./assets.mjs";

export const NODE_HEIGHT = 64;
export const ICON_SIZE = 52;

function nodeWidth(title) {
  const chars = Math.min(title.length, 90);
  return Math.round(Math.min(340, Math.max(190, 84 + chars * 6.2)));
}

/** Builds the nodes (without position yet) from the entry records. */
export async function buildNodes(records) {
  const nodes = [];

  for (const record of records) {
    const { entry } = record;
    const assets = await publishAssets(record);

    nodes.push({
      id: record.id,
      title: entry.title,
      description: entry.description,
      creation: entry.creation,
      sortKey: sortKey(entry.creation),
      year: yearOf(entry.creation),
      tags: entry.tags,
      urls: entry.urls,
      icon: assets.icon,
      media: assets.media,
      w: nodeWidth(entry.title),
      h: NODE_HEIGHT,
      x: 0,
      y: 0,
    });
  }

  return nodes;
}

/** Undirected, de-duplicated edges from the `connect` arrays. */
export function buildEdges(records) {
  const seen = new Set();
  const edges = [];

  for (const { id, entry } of records) {
    for (const target of entry.connect) {
      const key = [id, target].sort().join("|");

      if (!seen.has(key)) {
        seen.add(key);
        edges.push({ source: id, target });
      }
    }
  }

  return edges;
}
