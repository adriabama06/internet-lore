/**
 * Read-only view over `graph.json`: nodes, edges, adjacency and queries.
 * Knows nothing about the screen or the UI state.
 */
export class GraphData {
  static async load(url = "graph.json") {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Could not load ${url} (${response.status})`);
    }

    return new GraphData(await response.json());
  }

  constructor(raw) {
    this.iconSize = raw.iconSize;
    this.tags = raw.tags;
    this.nodes = raw.nodes;
    this.edges = raw.edges;
    this.byId = new Map(this.nodes.map((node) => [node.id, node]));
    this.adjacency = new Map(this.nodes.map((node) => [node.id, new Set()]));

    for (const { source, target } of this.edges) {
      this.adjacency.get(source)?.add(target);
      this.adjacency.get(target)?.add(source);
    }
  }

  get isEmpty() {
    return this.nodes.length === 0;
  }

  has(id) {
    return this.byId.has(id);
  }

  get(id) {
    return this.byId.get(id);
  }

  /** Connected entries, oldest first. */
  neighbors(id) {
    return [...(this.adjacency.get(id) ?? [])]
      .map((otherId) => this.byId.get(otherId))
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }

  /** First tag shared by two entries, or undefined. */
  sharedTag(idA, idB) {
    const tagsB = this.byId.get(idB).tags;
    return this.byId.get(idA).tags.find((tag) => tagsB.includes(tag));
  }

  /** One entry per year, anchored at its first (highest) node. */
  years() {
    const anchors = new Map();

    for (const node of this.nodes) {
      if (!anchors.has(node.year) || node.y < anchors.get(node.year)) {
        anchors.set(node.year, node.y);
      }
    }

    return [...anchors]
      .map(([year, y]) => ({ year, y }))
      .sort((a, b) => a.y - b.y);
  }

  /** Quick title/tag lookup for the search box suggestions. */
  suggest(text, limit = 8) {
    const needle = text.trim().toLowerCase();

    if (needle === "") {
      return [];
    }

    return this.nodes
      .filter((node) => `${node.title} ${node.tags.join(" ")}`.toLowerCase().includes(needle))
      .slice(0, limit);
  }

  /** Whether a node passes the text query and has every active tag. */
  matches(node, { query, activeTags }) {
    const haystack =
      `${node.title} ${node.description} ${node.tags.join(" ")} ${node.creation}`.toLowerCase();

    return (
      (query === "" || haystack.includes(query)) &&
      [...activeTags].every((tag) => node.tags.includes(tag))
    );
  }
}
