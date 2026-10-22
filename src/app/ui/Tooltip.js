import { tooltipHtml } from "./templates.js";

const GAP = 12;
const MARGIN = 8;
const AXIS_WIDTH = 70;

/** Small summary window shown next to a hovered node. */
export class Tooltip {
  /**
   * @param {HTMLElement} element  the tooltip element, positioned inside `stage`
   * @param {HTMLElement} stage    container used to keep the tooltip on screen
   * @param {import("../graph/Viewport.js").Viewport} viewport
   */
  constructor({ element, stage, viewport }) {
    this.element = element;
    this.stage = stage;
    this.viewport = viewport;
  }

  show(node) {
    const box = this.viewport.screenBox(node.id);

    if (!box) {
      return;
    }

    const { element } = this;
    element.innerHTML = tooltipHtml(node);
    element.hidden = false;

    const stage = this.stage.getBoundingClientRect();
    const { offsetWidth: width, offsetHeight: height } = element;
    const fitsRight = box.x2 + GAP + width <= stage.width - MARGIN;
    const left = fitsRight ? box.x2 + GAP : Math.max(AXIS_WIDTH, box.x1 - width - GAP);
    const top = Math.min(Math.max(MARGIN, box.y1), Math.max(MARGIN, stage.height - height - MARGIN));

    element.style.left = `${left}px`;
    element.style.top = `${top}px`;
  }

  hide() {
    this.element.hidden = true;
  }
}
