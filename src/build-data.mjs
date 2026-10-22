import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, extname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = join(repoRoot, "data");
const publicDir = join(repoRoot, "public");

const NODE_HEIGHT = 64;
const ICON_SIZE = 52;

const MEDIA_KINDS = {
  image: [".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".svg", ".bmp"],
  video: [".webm", ".mp4", ".mkv", ".mov", ".m4v", ".ogv"],
  audio: [".opus", ".mp3", ".ogg", ".flac", ".wav", ".m4a", ".aac"],
};

function toPosix(path) {
  return path.split(sep).join("/");
}

function mediaKind(name) {
  const ext = extname(name).toLowerCase();

  for (const [kind, extensions] of Object.entries(MEDIA_KINDS)) {
    if (extensions.includes(ext)) {
      return kind;
    }
  }

  return "file";
}

async function listFiles(directory) {
  try {
    const items = await readdir(directory, { withFileTypes: true });
    return items
      .filter((item) => item.isFile())
      .map((item) => item.name)
      .sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}

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

function sortDate(creation) {
  const [year, month = "01", day = "01"] = creation.split("-");
  return `${year}-${month}-${day}`;
}

function daysBetween(a, b) {
  return Math.max(0, (Date.parse(b) - Date.parse(a)) / 86400000);
}

function nodeWidth(title) {
  const chars = Math.min(title.length, 90);
  return Math.round(Math.min(340, Math.max(190, 84 + chars * 6.2)));
}

function layout(nodes, edges) {
  nodes.sort((a, b) =>
    a.sortDate === b.sortDate
      ? a.id.localeCompare(b.id)
      : a.sortDate.localeCompare(b.sortDate),
  );

  let y = 0;
  nodes.forEach((node, index) => {
    if (index > 0) {
      const days = daysBetween(nodes[index - 1].sortDate, node.sortDate);
      y += 100 + Math.min(130, 24 * Math.log2(1 + days / 30));
    }

    node.y = Math.round(y);
    node.x = ((index * 7919) % 9) * 170 - 680;
  });

  const byId = new Map(nodes.map((node) => [node.id, node]));
  const neighbors = new Map(nodes.map((node) => [node.id, []]));

  for (const edge of edges) {
    neighbors.get(edge.source).push(byId.get(edge.target));
    neighbors.get(edge.target).push(byId.get(edge.source));
  }

  for (let iteration = 0; iteration < 400; iteration++) {
    const cooling = 1 - iteration / 400;
    const shifts = new Map(nodes.map((node) => [node.id, 0]));

    for (const node of nodes) {
      const linked = neighbors.get(node.id);

      if (linked.length > 0) {
        const mean = linked.reduce((sum, other) => sum + other.x, 0) / linked.length;
        shifts.set(node.id, shifts.get(node.id) + (mean - node.x) * 0.12);
      }

      shifts.set(node.id, shifts.get(node.id) - node.x * 0.004);
    }

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const dy = Math.abs(a.y - b.y);

        if (dy > 260) {
          continue;
        }

        const dx = b.x - a.x;
        const wanted = (a.w + b.w) / 2 + 50;
        const overlap = wanted - Math.abs(dx);

        if (overlap > 0) {
          const push = overlap * 0.25 * (1 - dy / 320);
          const direction = dx === 0 ? (i % 2 === 0 ? 1 : -1) : Math.sign(dx);
          shifts.set(a.id, shifts.get(a.id) - direction * push);
          shifts.set(b.id, shifts.get(b.id) + direction * push);
        }
      }
    }

    for (const node of nodes) {
      node.x += shifts.get(node.id) * cooling;
    }
  }

  const minX = Math.min(...nodes.map((node) => node.x));
  const maxX = Math.max(...nodes.map((node) => node.x));
  const offset = -(minX + maxX) / 2;

  for (const node of nodes) {
    node.x = Math.round(node.x + offset);
  }
}

async function main() {
  const entryDirs = await findEntryDirs(dataDir);
  const nodes = [];
  const edges = [];
  const tags = JSON.parse(await readFile(join(dataDir, "tags.json"), "utf8"));
  const usedTags = new Set();

  await rm(join(publicDir, "data"), { recursive: true, force: true });

  for (const dir of entryDirs) {
    const id = toPosix(relative(dataDir, dir));
    const entry = JSON.parse(await readFile(join(dir, "entry.json"), "utf8"));
    const icons = await listFiles(join(dir, "icon"));
    const media = await listFiles(join(dir, "media"));
    const encode = (folder, name) =>
      `data/${id.split("/").map(encodeURIComponent).join("/")}/${folder}/${encodeURIComponent(name)}`;

    for (const folder of ["icon", "media"]) {
      const source = join(dir, folder);

      if ((await listFiles(source)).length > 0) {
        await mkdir(join(publicDir, "data", id), { recursive: true });
        await cp(source, join(publicDir, "data", id, folder), { recursive: true });
      }
    }

    entry.tags.forEach((tag) => usedTags.add(tag));

    nodes.push({
      id,
      title: entry.title,
      description: entry.description,
      creation: entry.creation,
      sortDate: sortDate(entry.creation),
      year: Number(entry.creation.slice(0, 4)),
      tags: entry.tags,
      urls: entry.urls,
      icon: icons.length > 0 ? encode("icon", icons[0]) : null,
      media: media.map((name) => ({
        name,
        kind: mediaKind(name),
        url: encode("media", name),
      })),
      w: nodeWidth(entry.title),
      h: NODE_HEIGHT,
    });

    for (const target of entry.connect) {
      edges.push({ source: id, target });
    }
  }

  const seen = new Set();
  const uniqueEdges = edges.filter(({ source, target }) => {
    const key = [source, target].sort().join("|");
    return seen.has(key) ? false : seen.add(key);
  });

  layout(nodes, uniqueEdges);

  const graph = {
    iconSize: ICON_SIZE,
    tags: tags.filter((tag) => usedTags.has(tag)),
    nodes,
    edges: uniqueEdges,
  };

  await mkdir(publicDir, { recursive: true });
  await writeFile(join(publicDir, "graph.json"), JSON.stringify(graph));
  console.log(`Built graph: ${nodes.length} nodes, ${uniqueEdges.length} edges.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
