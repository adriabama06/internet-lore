# AGENTS.md

Operational guide for AI agents and contributors working on **internet-lore**.

`CONTRIBUTING.md` is the human-facing summary. This file explains the full workflow,
the data model, and how the build and frontend fit together.

---

## 1. What this repository is

Internet Lore is a data-first static website: a 2D map of internet culture where every
entry is a node connected to related entries. Nodes are ordered vertically by their
creation/publication date.

- **Source of truth:** `data/`
- **Generated (never edit by hand):** `public/graph.json`, `public/data/`, `dist/`
- **Stack:** Node.js 22+, Vite 8, Cytoscape.js, vanilla ES modules
- **Deploy:** GitHub Pages via GitHub Actions

Most work is adding or fixing data under `data/`. Code changes are secondary.

---

## 2. Quick start

Requirements: Node.js 22+, npm and Git LFS.

```bash
git lfs install
npm install
npm run dev
```

`npm run dev` validates the data, rebuilds `public/graph.json`, copies assets to
`public/data/`, and starts Vite.

| Command | What it does |
| --- | --- |
| `npm run validate` | Validates every `entry.json`, tags and connections. |
| `npm run build:data` | Rebuilds `public/graph.json` and copies `icon/` + `media/` to `public/data/`. It does **not** validate; run `npm run validate` as well when calling it directly. |
| `npm run dev` | `validate` + `build:data` + Vite dev server. |
| `npm run build` | `validate` + `build:data` + production build into `dist/`. |
| `npm run preview` | Serves the production build locally. |

After changing anything under `data/`, run `npm run dev` again (or at least
`npm run build:data`). Vite's HMR only covers `src/`; it does not rebuild the graph
from data.

CI (`.github/workflows/validate.yml`) runs `npm run validate` and `npm run build`
on every push and pull request. Pushes to `main` deploy `dist/` to GitHub Pages
(`.github/workflows/deploy.yml`); the repository must have Pages configured with
**Source: GitHub Actions**.

---

## 3. Repository map

```
data/
  entry.schema.json          JSON Schema for every entry.json
  tags.json                  allowed tags
  useful_commands.md         small helper recipes
  <year>/<slug>/
    entry.json               the entry (required)
    icon/                    optional; the first file is used as the node icon
    media/                   published and shown in the details panel
    _original/               originals when a converted copy is used (not published)
    _extra/                  binaries/other files not shown directly (not published)

src/
  build/
    build-data.mjs           entry point: data/ -> public/graph.json
    readEntries.mjs          recursively finds and reads entry.json files
    assets.mjs               copies icon/media, detects media kinds
    graph.mjs                builds nodes and undirected edges
    layout/
      index.mjs              runs row + column layout
      rows.mjs               y position from dates
      columns.mjs            x position from a deterministic force relaxation
    paths.mjs                repo/data/public paths
  app/
    App.js                   wires all UI pieces through the store
    data/GraphData.js        read-only view over graph.json
    state/                   Store, AppStore, visibility, HashRouter
    graph/                   Cytoscape view, elements, styles, icons, viewport
    ui/                      SearchBox, TagFilter, YearAxis, Tooltip, DetailsPanel
    lib/                     dom, text, color helpers
  shared/dates.mjs           partial ISO date helpers
  styles/                    one CSS file per component
  index.html, main.js, vite.config.js

scripts/validate.mjs         schema + tag + connection validation
public/graph.json            generated; gitignored
public/data/                 generated; gitignored
dist/                        generated; gitignored
```

---

## 4. Data model

### Entry id

An entry id is its folder path relative to `data/`, without `entry.json`:

```
data/2009/bad_apple/entry.json  ->  "2009/bad_apple"
```

The id is permanent. It is used by `connect`, by the URL hash (`#2009/bad_apple`)
and by public links. **Never rename an existing entry folder** unless you also update
every reference and accept breaking old links.

### `entry.json`

Required fields:

| Field | Type | Rules |
| --- | --- | --- |
| `title` | string | Non-empty. |
| `description` | string | Non-empty. Explain what it is, where it comes from and why it matters. |
| `creation` | string | `YYYY`, `YYYY-MM` or `YYYY-MM-DD`. Must start with the folder year. Prefer the most precise verified date. |
| `tags` | string[] | At least one, unique. Each must exist in `data/tags.json`. Kebab-case. |
| `urls` | string[] | Unique valid URIs. Put the sources you used here. |
| `connect` | string[] | Unique entry ids (`YYYY/slug`). No self-connections. Targets must exist. |

Optional field:

- `$schema`: relative path to the schema, for editor autocomplete.

The schema uses `additionalProperties: false`, so **do not add new fields** without
updating `data/entry.schema.json`.

Minimal example:

```json
{
  "title": "PoFV - Yuka Kazami's Theme - Gensokyo, Past and Present ~ Flower Land",
  "description": "Where the track comes from and more context.",
  "creation": "2008-12-08",
  "tags": ["touhou", "music"],
  "urls": ["https://www.youtube.com/watch?v=44XWB99ts8E"],
  "connect": ["1995/touhou"]
}
```

### Dates

- Use ISO partial dates: `YYYY`, `YYYY-MM` or `YYYY-MM-DD`.
- The year must match the folder: `data/2011/...` requires a `creation` starting with `2011`.
- Use the date the content was published/created, not the date you added the entry.
- When a description mentions a time, use UTC+0 and say so.
- Missing month/day default to `01` internally for sorting, but the entry keeps the
  original precision.

### Tags

- Allowed tags live in `data/tags.json`.
- Pattern: `^[a-z0-9]+(?:-[a-z0-9]+)*$` (lowercase letters, numbers and single hyphens).
- Add a new tag to `data/tags.json` **before** using it in an entry.
- Only tags used by at least one entry are exposed as filters in the UI.
- Prefer a small, meaningful set over many near-duplicates.

### Connections

- `connect` is a list of entry ids, for example `["1995/touhou", "2011/pon_pon_pon"]`.
- **Connections always point backwards.** Conceptually the edge is
  `derived -> original`: a derived work, meme, remix, parody, clip, remake, etc.
  declares the original work/event/thing it references in its own `connect`.
- The original entry does **not** connect to its derivatives. Do not add a reverse
  link just because a newer entry points to it.
- Build a chain when needed: `original <- derived <- derivative`. Each entry declares
  only the earlier entry/entries it directly references.
- Edges are **undirected** and de-duplicated by the build, so one declaration is
  enough. Example: `2017/the_amazing_world_of_gumball_filth_filth_all_around`
  connects to `2011/pon_pon_pon` and `2011/the_amazing_world_of_gumball`; neither
  original entry needs to connect back.
- There is no relationship label on the edge. Explain the relationship in the
  `description`.
- Edge color is taken from a shared tag (the first one found on the source node);
  otherwise it is gray.

---

## 5. Complete process: add an entry

### Step 1 — Choose year and slug

- Year: when the content was published or created.
- Slug: lowercase, descriptive, stable. Existing convention uses underscores:
  `bad_apple`, `pon_pon_pon`, `the_amazing_world_of_gumball_filth_filth_all_around`.
- See `data/useful_commands.md` for the title-to-slug recipe.

Create the folders:

```bash
mkdir -p "data/2011/my_entry/icon" "data/2011/my_entry/media"
```

On Windows PowerShell:

```powershell
New-Item -ItemType Directory -Force "data/2011/my_entry/icon","data/2011/my_entry/media"
```

`icon/`, `media/`, `_original/` and `_extra/` are all optional; create only what you need.

### Step 2 — Add tags first

If your entry needs a new tag, edit `data/tags.json`:

```json
[
  "music",
  "videogame",
  "my-new-tag"
]
```

Keep the existing style (2-space indentation). Do not invent invalid characters.

### Step 3 — Write `entry.json`

Use an existing entry as a template. Fill every required field:

```json
{
  "title": "My entry",
  "description": "What it is, when it appeared, who made it, why it is relevant, and how it relates to the connected entries.",
  "creation": "2011-07-16",
  "tags": ["my-new-tag", "music"],
  "urls": [
    "https://example.com/source",
    "https://en.wikipedia.org/wiki/Example"
  ],
  "connect": ["2011/another_entry"]
}
```

Guidelines for the description:

- Be factual and specific. Include names, dates and context.
- Put the primary source URLs in `urls`; do not rely on the description as a link dump.
- If something is incomplete, lost or uncertain, say so explicitly instead of guessing.
- If a video/version is a recreation, say it is a recreation.
- Keep it readable; long descriptions are fine when the topic needs context.

### Step 4 — Add an icon (optional but recommended)

- Put an image in `data/<year>/<slug>/icon/`.
- The build uses the **first file in alphabetical order** as the node icon.
- Square or near-square images work best. The frontend center-crops non-square icons.
- If there is no icon, the app draws a colored square with the title initials.

### Step 5 — Add media (optional)

Put files in `data/<year>/<slug>/media/`. They are published and shown in the
details panel, ordered by filename.

Supported kinds are detected by extension:

- **Images:** `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.avif`, `.svg`, `.bmp`
- **Video:** `.webm`, `.mp4`, `.mkv`, `.mov`, `.m4v`, `.ogv`
- **Audio:** `.opus`, `.mp3`, `.ogg`, `.flac`, `.wav`, `.m4a`, `.aac`
- **Other:** any other extension becomes a downloadable file link.

Use the other folders deliberately:

- `_original/`: keep the original file when `media/` contains a converted copy.
- `_extra/`: binaries and files that should be preserved but not displayed.

Conventions for YouTube media used in this repo:

- Filename: `<video title> [<videoId>].<ext>` (the exact title is not enforced).
- Keep a `yt-dlp.txt` log in `media/` when you download with yt-dlp.
- Prefer the best available quality for important material, but keep files reasonably
  sized. Video files are stored with Git LFS.

### Step 6 — Add connections

Add the target ids to `connect`. Connections must point backwards: put the
original/referenced entries in the new (derived) entry's `connect`, never the other
way around.

Example: the Gumball clip is a derivative of both PONPONPON and the Gumball series,
so the clip declares both, and neither original declares the clip:

```json
"connect": ["2011/pon_pon_pon", "2011/the_amazing_world_of_gumball"]
```

Before saving, check that:

- the target folders exist and contain `entry.json`;
- you are not connecting an entry to itself;
- the relationship is explained in the description;
- the edge points from the newer/derived entry to the older/original one;
- you did not add a reverse link from the original to the derivative;
- you are not duplicating an edge that the other entry already declares.

### Step 7 — Validate

```bash
npm run validate
```

The validator checks:

- every entry lives at `data/<4-digit-year>/<slug>/entry.json`;
- the JSON matches `data/entry.schema.json`;
- `creation` starts with the folder year;
- every tag exists in `data/tags.json`;
- every `connect` target exists;
- no entry connects to itself;
- tags and URLs are unique.

Fix all errors before continuing.

### Step 8 — Build and inspect

```bash
npm run build:data
# or, to check the full site:
npm run build
```

`build:data` prints the node/edge count and regenerates `public/graph.json` and
`public/data/`. To inspect visually:

```bash
npm run dev
```

Check that:

- the node appears at the expected date;
- the icon and media render;
- the details panel shows links and connections;
- filtering/searching finds the entry;
- the new edge appears and is colored sensibly.

### Step 9 — Git

```bash
git status
git add data/
# add code/docs separately if you changed them
git commit -m "Add <entry title>"
```

Rules:

- Do not commit generated `public/graph.json`, `public/data/` or `dist/` files; they are gitignored.
- Ensure Git LFS is installed before adding video files.
- Keep pull requests focused: one entry or one code change is ideal.
- Explain your sources in the pull request description.
- Do not rename existing entry folders.

---

## 6. How the build works

The build is a one-way pipeline:

```
data/**/entry.json
        |
        v
scripts/validate.mjs  (must pass first)
        |
        v
src/build/build-data.mjs
  readEntries()        find every entry.json, id = relative folder
  cleanPublishedAssets() rm -rf public/data
  buildNodes()         publishAssets() + sortKey/year/width/height
  buildEdges()         undirected, de-duplicated edges
  layoutGraph()        rows by date, then columns by force relaxation
  filter tags          only tags used by at least one node
        |
        v
public/graph.json  +  public/data/<id>/{icon,media}/...
```

### `src/build/readEntries.mjs`

Recursively walks `data/`, finds every `entry.json`, and returns records
`{ id, dir, entry }`, sorted by id. `id` is the POSIX-style relative folder path.

### `src/build/assets.mjs`

- `PUBLISHED_FOLDERS = ["icon", "media"]`; `_original/` and `_extra/` are not copied.
- `icon` is the first file in `icon/` sorted with `localeCompare`.
- `media` is every file in `media/` sorted the same way.
- `mediaKind()` maps extension to `image`, `video`, `audio` or `file`.
- Asset URLs are `data/<encoded id>/<folder>/<encoded name>`.
- `cleanPublishedAssets()` deletes `public/data` on every build, so stale assets do
  not survive.

### `src/build/graph.mjs`

- `NODE_HEIGHT = 64`, `ICON_SIZE = 52`.
- Node width: `clamp(84 + titleLength * 6.2, 190, 340)`, with title length capped at 90.
- `buildEdges()` creates an undirected edge per unique sorted pair
  `[source, target].sort().join("|")`, so reciprocal `connect` declarations collapse
  into one edge.

### Layout

- `rows.mjs`: sorts nodes by `sortKey` (then id), assigns one row per node.
  The vertical gap is `100 + min(130, 24 * log2(1 + monthsBetweenRows))`.
  This keeps chronological order while preventing decades from taking the whole map.
- `columns.mjs`: deterministic force relaxation over 400 iterations.
  Connected nodes attract, a weak centering force pulls toward x=0, and nodes whose
  cards overlap within 260px vertically repel each other. Then the whole graph is
  centered horizontally.
- `layout/index.mjs` runs rows first, then columns.

### `public/graph.json`

The generated file has this shape:

```json
{
  "iconSize": 52,
  "tags": ["music", "touhou"],
  "nodes": [
    {
      "id": "2009/bad_apple",
      "title": "Bad Apple!!",
      "description": "...",
      "creation": "2009-10-27",
      "sortKey": "2009-10-27",
      "year": 2009,
      "tags": ["touhou", "music"],
      "urls": ["..."],
      "icon": "data/2009/bad_apple/icon/FtutLA63Cp8.jpg",
      "media": [
        { "name": "...", "kind": "video", "url": "data/..." }
      ],
      "w": 190,
      "h": 64,
      "x": 245,
      "y": 415
    }
  ],
  "edges": [
    { "source": "2009/bad_apple", "target": "1995/touhou" }
  ]
}
```

`public/graph.json` and `public/data/` are generated and gitignored. **Never edit
them manually.**

---

## 7. How the frontend works

`src/main.js` imports the CSS and calls `App.start()`.

### Data layer

`src/app/data/GraphData.js` fetches `graph.json` (relative URL, works on GitHub Pages
because Vite uses `base: "./"`). It provides:

- `byId`, `adjacency`
- `neighbors(id)` — connected entries, oldest first
- `sharedTag(idA, idB)` — first shared tag, used for edge color
- `years()` — one anchor per year, at the highest node of that year
- `suggest(text)` — search suggestions
- `matches(node, { query, activeTags })` — filtering; the query is matched against
  title, description, tags and creation, and every active tag must be present

`GraphData` is immutable from the UI's point of view. Do not mutate it.

### State

`src/app/state/Store.js` is a minimal observable container.

`src/app/state/AppStore.js` holds:

- `selectedId`
- `query`
- `activeTags` (a `Set`)

`src/app/state/visibility.js` is a pure function that turns data + state into:

- `dimmedNodes` / `dimmedEdges` — filtered out or unrelated to the selection
- `hotNodes` / `hotEdges` — the selected node and its neighborhood

`HashRouter` keeps the selection in `location.hash` (`#2009/bad_apple`), so links are
shareable.

### Rendering

- `GraphView` creates a Cytoscape instance with a `preset` layout (positions come
  from `graph.json`). It only renders and reports pointer events.
- `elements.js` turns nodes/edges into Cytoscape elements. Edges get the color of
  their first shared tag.
- `icons.js` loads an entry icon and center-crops it to a square; if there is no icon,
  it draws initials on a tag-colored square.
- `styles.js` defines the node card, icon and edge appearance.
- `Viewport.js` wraps zoom/pan/fit and map-to-screen conversions.
- `DetailsPanel` renders the selected entry: date, tags, description, links,
  connected entries and media.
- `SearchBox`, `TagFilter`, `YearAxis`, `Tooltip` are the other UI pieces.

### Data flow

```
GraphData (read-only) + AppStore (UI state)
        |
        v
computeVisibility()
        |
        v
GraphView / DetailsPanel / TagFilter / YearAxis / Tooltip
```

Components do not talk to each other directly. `App.js` wires them through the store.

---

## 8. Conventions for agents

- Keep changes consistent with the surrounding code and the existing data style.
- Prefer editing data over rewriting the frontend.
- Use ES modules and vanilla JS; there is no React/Vue/framework.
- Keep one responsibility per file; follow the existing folder structure.
- Use `escapeHtml` (or the existing template helpers) for anything rendered from data.
- Do not edit `public/graph.json`, `public/data/` or `dist/` by hand.
- Do not rename existing folders under `data/`; their paths are ids.
- Do not add fields to `entry.json` without updating the schema.
- Do not add tags to an entry without adding them to `data/tags.json`.
- Do not invent dates, creators, sources or connections. If a fact is uncertain,
  state that in the description and cite what you have.
- For research, use reliable sources and record them in `urls`. Cross-check dates
  when sources disagree.
- Keep media reasonably sized. Video files must go through Git LFS (`*.webm`, `*.mp4`, etc.).
- There is no test suite. `npm run validate` and `npm run build` are the checks.
- Run `npm run validate` and `npm run build` before finishing.

---

## 9. Definition of done

- [ ] Entry folder is `data/<year>/<slug>/` and the year matches `creation`.
- [ ] `entry.json` has all required fields and no extra fields.
- [ ] Tags exist in `data/tags.json`.
- [ ] Every `connect` target exists; no self-connections.
- [ ] Connections point backwards (derived → original); originals do not link to derivatives.
- [ ] Icon/media are in the correct folders (`icon/`, `media/`, `_original/`, `_extra/`).
- [ ] Sources are in `urls`.
- [ ] `npm run validate` passes.
- [ ] `npm run build` passes.
- [ ] The node, icon, media, links and connections look correct in `npm run dev`.
- [ ] `git status` shows only the intended changes; generated folders are untouched.
- [ ] Pull request explains the sources and, for frontend changes, includes a screenshot
      or short recording.
