import { Store } from "./Store.js";

/** UI state of the map: which entry is selected, text query and tag filters. */
export class AppStore extends Store {
  constructor() {
    super({ selectedId: null, query: "", activeTags: new Set() });
  }

  select(id) {
    if (id !== this.state.selectedId) {
      this.set({ selectedId: id });
    }
  }

  setQuery(text) {
    this.set({ query: text.trim().toLowerCase() });
  }

  toggleTag(tag) {
    const activeTags = new Set(this.state.activeTags);
    activeTags.has(tag) ? activeTags.delete(tag) : activeTags.add(tag);
    this.set({ activeTags });
  }
}

export const isFiltering = ({ query, activeTags }) => query !== "" || activeTags.size > 0;
