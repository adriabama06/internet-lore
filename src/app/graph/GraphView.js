import cytoscape from "cytoscape";
import { ICON_PIXELS, buildElements } from "./elements.js";
import { loadImageIcon } from "./icons.js";
import { buildStyle } from "./styles.js";
import { Viewport } from "./Viewport.js";

/**
 * Draws the map with Cytoscape. It only knows how to render and report
 * pointer events; what to show is decided by the app (see `visibility.js`).
 */
export class GraphView {
  /**
   * @param {object} options
   * @param {HTMLElement} options.container
   * @param {import("../data/GraphData.js").GraphData} options.data
   * @param {(id: string | null, event: object) => void} options.onHover
   * @param {(id: string | null) => void} options.onTap  `null` = background
   */
  constructor({ container, data, onHover, onTap }) {
    this.data = data;
    this.container = container;
    this.cy = cytoscape({
      container,
      layout: { name: "preset" },
      elements: buildElements(data),
      style: buildStyle(data.iconSize),
      wheelSensitivity: 5,
      minZoom: 0.05,
      maxZoom: 2.5,
      boxSelectionEnabled: false,
      autoungrabify: true,
    });
    this.viewport = new Viewport(this.cy);

    this.#bindEvents({ onHover, onTap });
    this.viewport.fit();
    this.viewport.repaintSoon(150);
    setTimeout(() => this.viewport.repaint(), 800);
  }

  /** Replaces the initials placeholders with the entries' real icons. */
  async loadIcons() {
    const size = ICON_PIXELS(this.data.iconSize);

    await Promise.allSettled(
      this.data.nodes
        .filter((node) => node.icon)
        .map(async (node) => {
          const url = await loadImageIcon(node.icon, size);
          this.cy.getElementById(node.id).data("iconUrl", url);
          this.viewport.repaintSoon();
        }),
    );
  }

  /** Applies the result of `computeVisibility` as classes. */
  applyVisibility({ focus, dimmedNodes, hotNodes, dimmedEdges, hotEdges }) {
    this.cy.batch(() => {
      this.cy.elements().removeClass("dim hot picked");

      this.cy.nodes().forEach((node) => {
        node.toggleClass("dim", dimmedNodes.has(node.id()));
        node.toggleClass("hot", hotNodes.has(node.id()));
        node.toggleClass("picked", node.id() === focus);
      });

      this.cy.edges().forEach((edge) => {
        edge.toggleClass("dim", dimmedEdges.has(edge.id()));
        edge.toggleClass("hot", hotEdges.has(edge.id()));
      });
    });
  }

  positionOf(id) {
    return this.cy.getElementById(id).position();
  }

  #bindEvents({ onHover, onTap }) {
    this.cy.on("mouseover", "node", (event) => {
      this.container.style.cursor = "pointer";
      onHover(event.target.id());
    });

    this.cy.on("mouseout", "node", () => {
      this.container.style.cursor = "";
      onHover(null);
    });

    this.cy.on("viewport", () => onHover(null));
    this.cy.on("tap", "node", (event) => onTap(event.target.id()));
    this.cy.on("tap", (event) => event.target === this.cy && onTap(null));
    window.addEventListener("resize", () => this.cy.resize());
  }
}
