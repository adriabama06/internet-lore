import { readFile, readdir } from "node:fs/promises";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";
import addFormats from "ajv-formats";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = join(repoRoot, "data");
const tagPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function toPosix(path) {
  return path.split(sep).join("/");
}

function isPartialIsoDate(value) {
  const match = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/.exec(value);

  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = match[2] === undefined ? undefined : Number(match[2]);
  const day = match[3] === undefined ? undefined : Number(match[3]);

  if (month !== undefined && (month < 1 || month > 12)) {
    return false;
  }

  if (day !== undefined) {
    const date = new Date(Date.UTC(year, month - 1, day));

    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      return false;
    }
  }

  return true;
}

async function readJson(file) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    throw new Error(`${toPosix(relative(repoRoot, file))}: ${error.message}`);
  }
}

async function findEntryFiles(directory) {
  const files = [];

  for (const item of await readdir(directory, { withFileTypes: true })) {
    const fullPath = join(directory, item.name);

    if (item.isDirectory()) {
      files.push(...(await findEntryFiles(fullPath)));
    } else if (item.isFile() && item.name === "entry.json") {
      files.push(fullPath);
    }
  }

  return files;
}

function validateTags(tags) {
  if (!Array.isArray(tags)) {
    return ["data/tags.json: expected an array of tag names."];
  }

  const errors = [];
  const seen = new Set();

  for (const tag of tags) {
    if (typeof tag !== "string" || !tagPattern.test(tag)) {
      errors.push(
        `data/tags.json: invalid tag ${JSON.stringify(tag)}. Use lowercase letters, numbers and hyphens.`,
      );
    } else if (seen.has(tag)) {
      errors.push(`data/tags.json: duplicated tag "${tag}".`);
    } else {
      seen.add(tag);
    }
  }

  return errors;
}

async function main() {
  const errors = [];
  const tags = await readJson(join(dataDir, "tags.json"));
  errors.push(...validateTags(tags));

  const tagSet = new Set(Array.isArray(tags) ? tags : []);

  const ajv = new Ajv({ allErrors: true, strict: true });
  addFormats(ajv);
  ajv.addFormat("partial-date", {
    type: "string",
    validate: isPartialIsoDate,
  });

  const validateEntry = ajv.compile(
    await readJson(join(repoRoot, "entry.schema.json")),
  );

  const entryFiles = await findEntryFiles(dataDir);
  const entries = new Map();

  for (const file of entryFiles) {
    const id = toPosix(relative(dataDir, dirname(file)));
    entries.set(id, { file, data: await readJson(file) });
  }

  if (entries.size === 0) {
    errors.push("data/: no entry.json files found.");
  }

  for (const [id, { file, data }] of entries) {
    const entryPath = toPosix(relative(repoRoot, file));
    const idParts = id.split("/");

    if (
      idParts.length !== 2 ||
      !/^\d{4}$/.test(idParts[0]) ||
      idParts[1].length === 0
    ) {
      errors.push(
        `${entryPath}: entries must live at data/<year>/<slug>/entry.json.`,
      );
    }

    if (!validateEntry(data)) {
      for (const issue of validateEntry.errors ?? []) {
        errors.push(
          `${entryPath}${issue.instancePath || "/"}: ${issue.message}`,
        );
      }

      continue;
    }

    if (idParts.length === 2 && !data.creation.startsWith(idParts[0])) {
      errors.push(
        `${entryPath}: creation "${data.creation}" does not match data/${idParts[0]}/.`,
      );
    }

    for (const tag of data.tags) {
      if (!tagSet.has(tag)) {
        errors.push(
          `${entryPath}: unknown tag "${tag}". Add it to data/tags.json.`,
        );
      }
    }

    for (const target of data.connect) {
      if (target === id) {
        errors.push(`${entryPath}: an entry cannot connect to itself.`);
      } else if (!entries.has(target)) {
        errors.push(
          `${entryPath}: connect target "${target}" does not exist.`,
        );
      }
    }
  }

  if (errors.length > 0) {
    console.error(`Validation failed with ${errors.length} error(s):`);

    for (const error of errors) {
      console.error(`  - ${error}`);
    }

    process.exitCode = 1;
    return;
  }

  console.log(`OK: ${entries.size} entries validated.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
