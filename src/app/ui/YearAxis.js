const EDGE_TOP = 8;
const EDGE_BOTTOM = 14;
const MIN_LABEL_SPACING = 18;

/** Vertical year ruler that follows the camera. Labels that would overlap are hidden. */
export class YearAxis {
  /**
   * @param {HTMLElement} container
   * @param {{ year: number, y: number }[]} years  sorted by `y`
   * @param {import("../graph/Viewport.js").Viewport} viewport
   */
  constructor({ container, years, viewport }) {
    this.viewport = viewport;
    this.labels = years.map(({ year, y }) => {
      const element = document.createElement("div");
      element.className = "year";
      element.textContent = year;
      container.append(element);
      return { y, element };
    });

    viewport.onChange(() => this.update());
    this.update();
  }

  update() {
    let lastY = -Infinity;

    for (const { y, element } of this.labels) {
      const screenY = this.viewport.screenY(y);
      const visible =
        screenY > EDGE_TOP &&
        screenY < this.viewport.height - EDGE_BOTTOM &&
        screenY - lastY > MIN_LABEL_SPACING;

      element.style.display = visible ? "" : "none";

      if (visible) {
        element.style.top = `${screenY}px`;
        lastY = screenY;
      }
    }
  }
}
