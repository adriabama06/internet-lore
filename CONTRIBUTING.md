# Contributing to internet-lore

Thanks for helping preserve the origins and connections of internet culture. Every well-sourced entry helps, even if it is small.

## Requirements

- Node.js 22 or newer
- npm
- Git LFS

```bash
git lfs install
npm install
```

## Repository layout

- `data/<year>/<slug>/entry.json`: the entry. The folder path (`<year>/<slug>`) is its permanent id.
- `data/<year>/<slug>/icon/`: optional. The first file is used as the node icon.
- `data/<year>/<slug>/media/`: images, video, audio, text and metadata shown in the app.
- `data/<year>/<slug>/_original/`: original files when a converted copy is used.
- `data/<year>/<slug>/_extra/`: binaries and other files that are not displayed directly.
- `data/entry.schema.json`: schema for `entry.json`.
- `data/tags.json`: allowed tags.
- `src/`: static frontend (Vite + Cytoscape.js). See "Code structure" below.
- `scripts/`: entry validator.

## Add an entry

1. Create a folder at `data/<year>/<descriptive-slug>/`. Use the year in which the content was published or created. The folder is the id used by `connect`, so do not rename it later.
2. Create `entry.json` in that folder:

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

3. Use ISO 8601 dates: `YYYY`, `YYYY-MM` or `YYYY-MM-DD`. Prefer the most precise date you can verify. Use UTC+0 when adding times in the description.
4. Tags must exist in `data/tags.json`. Add new tags there using lowercase letters, numbers and hyphens.
5. `connect` is an array of entry ids, for example `"2008/PoFV_Yuka_Kazamis_Theme_Gensokyo_Past_and_Present_Flower_Land"`. Describe the type of relationship in the entry description for now. Entries cannot connect to themselves.
6. Add media inside `icon/`, `media/`, `_original/` or `_extra/`. Keep the original filename and format when possible.
7. Validate your work:

```bash
npm run validate
npm run dev
```

## Frontend

```bash
npm run dev
```

This validates the data, generates `public/graph.json`, and starts Vite. Run it again after changing files under `data/`.

```bash
npm run build
npm run preview
```

`npm run build` validates, rebuilds the generated data and writes the static site to `dist/`.

Pushes to `main` deploy the site with `.github/workflows/deploy.yml`. The repository must have Pages configured with **Source: GitHub Actions** under Settings â†’ Pages.

## Media and Git LFS

Video files are stored with Git LFS. Install it before adding media:

```bash
git lfs install
```

The relevant extensions are listed in `.gitattributes`. Keep files reasonably sized and only upload material you can redistribute. When in doubt, link to the source and keep a small preview instead of committing a large file.

## Pull requests

- Keep each pull request focused. One entry or one frontend fix is ideal.
- Explain your sources in the pull request description.
- Include screenshots or a short screen recording for frontend changes.
- CI runs `npm run validate` and `npm run build`. Both must pass.
- Do not rename existing entry folders: their paths are used by `connect` and by public links.

## Licensing

The repository code is released under The Unlicense. That does not grant rights over third-party media. Only contribute files you have permission to redistribute, and always record the original source URL in the entry.

## Code structure

```
src/
  index.html, main.js, vite.config.js
  shared/dates.mjs        date helpers used by the build and the browser
  build/                  Node, runs before Vite: data/ -> public/graph.json
    build-data.mjs        entry point
    readEntries.mjs       finds and reads every entry.json
    assets.mjs            copies icon/ and media/ to public/data/, detects media kinds
    graph.mjs             builds nodes and edges
    layout/               rows.mjs (y by date), columns.mjs (x), index.mjs
  app/                    browser
    App.js                creates and connects everything
    data/GraphData.js     read-only view of graph.json (adjacency, search, years)
    state/                Store, AppStore (selection, query, tags), visibility, HashRouter
    graph/                Cytoscape: GraphView, Viewport (camera), styles, elements, icons, labels
    ui/                   SearchBox, TagFilter, YearAxis, Tooltip, DetailsPanel, templates
    lib/                  small helpers (dom, text, color)
  styles/                 one CSS file per component
```

Data flows one way: `GraphData` (immutable) + `AppStore` (UI state) -> `computeVisibility` -> `GraphView`/UI. Components do not talk to each other; `App` wires them.
