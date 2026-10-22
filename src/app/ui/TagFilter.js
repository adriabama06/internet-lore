import { tagColor } from "../lib/color.js";

/** Row of toggleable tag chips. */
export class TagFilter {
  #chips = new Map();

  /**
   * @param {HTMLElement} container
   * @param {string[]} tags
   * @param {(tag: string) => void} onToggle
   */
  constructor({ container, tags, onToggle }) {
    for (const tag of tags) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip";
      chip.textContent = tag;
      chip.style.setProperty("--tag", tagColor(tag));
      chip.addEventListener("click", () => onToggle(tag));
      container.append(chip);
      this.#chips.set(tag, chip);
    }
  }

  render(activeTags) {
    for (const [tag, chip] of this.#chips) {
      chip.classList.toggle("on", activeTags.has(tag));
    }
  }
}
