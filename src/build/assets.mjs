import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { extname, join } from "node:path";
import { publicDir } from "./paths.mjs";

const MEDIA_KINDS = {
  image: [".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".svg", ".bmp"],
  video: [".webm", ".mp4", ".mkv", ".mov", ".m4v", ".ogv"],
  audio: [".opus", ".mp3", ".ogg", ".flac", ".wav", ".m4a", ".aac"],
};

/** Only these folders are published. `_original/` and `_extra/` stay in the repository. */
const PUBLISHED_FOLDERS = ["icon", "media"];

export function mediaKind(name) {
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

function assetUrl(id, folder, name) {
  const idPath = id.split("/").map(encodeURIComponent).join("/");
  return `data/${idPath}/${folder}/${encodeURIComponent(name)}`;
}

export function cleanPublishedAssets() {
  return rm(join(publicDir, "data"), { recursive: true, force: true });
}

/**
 * Copies the published folders of an entry to `public/data/<id>/` and
 * returns what the frontend needs to show them.
 */
export async function publishAssets({ id, dir }) {
  for (const folder of PUBLISHED_FOLDERS) {
    if ((await listFiles(join(dir, folder))).length > 0) {
      await mkdir(join(publicDir, "data", id), { recursive: true });
      await cp(join(dir, folder), join(publicDir, "data", id, folder), {
        recursive: true,
      });
    }
  }

  const [icon] = await listFiles(join(dir, "icon"));
  const media = await listFiles(join(dir, "media"));

  return {
    icon: icon ? assetUrl(id, "icon", icon) : null,
    media: media.map((name) => ({
      name,
      kind: mediaKind(name),
      url: assetUrl(id, "media", name),
    })),
  };
}
