const FIT_PADDING = 70;
const MAX_FIT_ZOOM = 1;
const MIN_FOCUS_ZOOM = 0.9;
const FOCUS_ANIMATION_MS = 350;

/**
 * Camera over the map: zoom, pan and conversions between map coordinates
 * and screen pixels. The rest of the UI uses this instead of touching Cytoscape.
 */
export class Viewport {
  #cy;
  #repaintTimer;

  constructor(cy) {
    this.#cy = cy;
  }

  get width() {
    return this.#cy.width();
  }

  get height() {
    return this.#cy.height();
  }

  /** Calls `callback` whenever the camera moves, zooms or the container resizes. */
  onChange(callback) {
    this.#cy.on("viewport resize", callback);
  }

  /** Shows the whole map, without zooming in past 100%. */
  fit() {
    this.#cy.fit(undefined, FIT_PADDING);

    if (this.#cy.zoom() > MAX_FIT_ZOOM) {
      this.#cy.zoom({
        level: MAX_FIT_ZOOM,
        renderedPosition: { x: this.width / 2, y: this.height / 2 },
      });
      this.#cy.center();
    }
  }

  /** Smoothly moves the camera so a map position sits near the screen center. */
  centerOn(position, { offsetX = 0 } = {}) {
    const zoom = Math.max(this.#cy.zoom(), MIN_FOCUS_ZOOM);

    this.#cy.animate({
      zoom,
      pan: {
        x: this.width / 2 + offsetX - position.x * zoom,
        y: this.height / 2 - position.y * zoom,
      },
      duration: FOCUS_ANIMATION_MS,
    });
  }

  /** Screen Y (px, relative to the map container) of a map Y. */
  screenY(mapY) {
    return mapY * this.#cy.zoom() + this.#cy.pan().y;
  }

  /** Screen rectangle of a node, or null if it does not exist. */
  screenBox(id) {
    const element = this.#cy.getElementById(id);
    return element.nonempty() ? element.renderedBoundingBox() : null;
  }

  /** Cytoscape paints images asynchronously; this forces a redraw (debounced). */
  repaintSoon(delay = 50) {
    clearTimeout(this.#repaintTimer);
    this.#repaintTimer = setTimeout(() => this.repaint(), delay);
  }

  repaint() {
    this.#cy.style().update();
    this.#cy.forceRender();
  }
}
