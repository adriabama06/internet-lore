import { detailsHtml } from "./templates.js";

/** Side panel with the full information of the selected entry. */
export class DetailsPanel {
  /**
   * @param {HTMLElement} element
   * @param {import("../data/GraphData.js").GraphData} data
   * @param {() => void} onClose
   * @param {(id: string) => void} onNavigate  a connected entry was clicked
   */
  constructor({ element, data, onClose, onNavigate }) {
    this.element = element;
    this.data = data;

    element.addEventListener("click", (event) => {
      if (event.target.closest(".close")) {
        onClose();
      }

      const link = event.target.closest("button.link");

      if (link) {
        onNavigate(link.dataset.id);
      }
    });
  }

  show(node) {
    this.#pausePlayers();
    this.element.innerHTML = detailsHtml(node, this.data.neighbors(node.id));
    this.element.scrollTop = 0;
    this.element.hidden = false;
  }

  hide() {
    this.#pausePlayers();
    this.element.hidden = true;
  }

  #pausePlayers() {
    this.element.querySelectorAll("video, audio").forEach((player) => player.pause());
  }
}
