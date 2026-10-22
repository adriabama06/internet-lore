import { GraphData } from "./data/GraphData.js";
import { GraphView } from "./graph/GraphView.js";
import { $ } from "./lib/dom.js";
import { AppStore } from "./state/AppStore.js";
import { HashRouter } from "./state/HashRouter.js";
import { computeVisibility } from "./state/visibility.js";
import { DetailsPanel } from "./ui/DetailsPanel.js";
import { SearchBox } from "./ui/SearchBox.js";
import { TagFilter } from "./ui/TagFilter.js";
import { Tooltip } from "./ui/Tooltip.js";
import { YearAxis } from "./ui/YearAxis.js";

/** Space reserved for the details panel when centering a selected node. */
const PANEL_OFFSET_X = -220;
const PANEL_MIN_SCREEN = 900;

/** Creates every piece and connects them through the store. */
export class App {
  static async start() {
    const message = $("#empty");

    try {
      const app = new App(await GraphData.load());
      app.init();
    } catch (error) {
      console.error(error);
      message.hidden = false;
      message.textContent = "Could not load the map data.";
    }
  }

  constructor(data) {
    this.data = data;
    this.store = new AppStore();
    this.router = new HashRouter();
  }

  init() {
    const { data, store } = this;

    this.view = new GraphView({
      container: $("#cy"),
      data,
      onHover: (id) => this.#hover(id),
      onTap: (id) => this.select(id),
    });
    const { viewport } = this.view;

    this.tooltip = new Tooltip({ element: $("#tooltip"), stage: $("#stage"), viewport });
    this.details = new DetailsPanel({
      element: $("#details"),
      data,
      onClose: () => this.select(null),
      onNavigate: (id) => this.select(id, { center: true }),
    });
    this.tagFilter = new TagFilter({
      container: $("#tags"),
      tags: data.tags,
      onToggle: (tag) => store.toggleTag(tag),
    });
    this.search = new SearchBox({
      input: $("#search"),
      results: $("#results"),
      data,
      onQuery: (text) => store.setQuery(text),
      onPick: (id) => this.select(id, { center: true }),
    });
    new YearAxis({ container: $("#axis"), years: data.years(), viewport });

    $("#fit").addEventListener("click", () => viewport.fit());
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !this.search.isFocused) {
        this.select(null);
      }
    });

    store.subscribe((state, previous) => this.#render(state, previous));
    this.router.onChange((id) => this.#fromRouter(id));

    if (data.isEmpty) {
      $("#empty").hidden = false;
      $("#empty").textContent = "There are no entries yet.";
    }

    this.view.loadIcons();
    this.#fromRouter(this.router.read());
  }

  select(id, { center = false } = {}) {
    const target = id && this.data.has(id) ? id : null;

    if (target && center) {
      this.view.viewport.centerOn(this.view.positionOf(target), {
        offsetX: window.innerWidth > PANEL_MIN_SCREEN ? PANEL_OFFSET_X : 0,
      });
    }

    this.store.select(target);
  }

  #fromRouter(id) {
    if (id !== this.store.state.selectedId) {
      this.select(id, { center: true });
    }
  }

  #hover(id) {
    if (!this.tooltip) {
      return;
    }

    id ? this.tooltip.show(this.data.get(id)) : this.tooltip.hide();
  }

  #render(state, previous) {
    this.view.applyVisibility(computeVisibility(this.data, state));
    this.tagFilter.render(state.activeTags);

    if (state.selectedId !== previous.selectedId) {
      this.tooltip.hide();
      this.router.write(state.selectedId);
      state.selectedId
        ? this.details.show(this.data.get(state.selectedId))
        : this.details.hide();
    }
  }
}
