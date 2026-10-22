import { escapeHtml } from "../lib/dom.js";
import { truncate } from "../lib/text.js";

/** Text input that filters the map and suggests entries to jump to. */
export class SearchBox {
  #suggestions = [];
  #active = -1;

  /**
   * @param {HTMLInputElement} input
   * @param {HTMLElement} results  list element for the suggestions
   * @param {import("../data/GraphData.js").GraphData} data
   * @param {(text: string) => void} onQuery
   * @param {(id: string) => void} onPick
   */
  constructor({ input, results, data, onQuery, onPick }) {
    this.input = input;
    this.results = results;
    this.data = data;
    this.onPick = onPick;

    input.addEventListener("input", () => {
      onQuery(input.value);
      this.#renderSuggestions();
    });
    input.addEventListener("keydown", (event) => this.#onKey(event));
    input.addEventListener("blur", () => (results.hidden = true));
  }

  get isFocused() {
    return document.activeElement === this.input;
  }

  #renderSuggestions() {
    this.#suggestions = this.data.suggest(this.input.value);
    this.#active = this.#suggestions.length > 0 ? 0 : -1;
    this.results.hidden = this.#suggestions.length === 0;

    this.results.replaceChildren(
      ...this.#suggestions.map((node) => {
        const item = document.createElement("li");
        item.innerHTML = `<span>${escapeHtml(truncate(node.title, 44))}</span><span>${node.year}</span>`;
        item.addEventListener("mousedown", (event) => {
          event.preventDefault();
          this.#pick(node.id);
        });
        return item;
      }),
    );

    this.#markActive();
  }

  #markActive() {
    [...this.results.children].forEach((item, index) =>
      item.classList.toggle("active", index === this.#active),
    );
  }

  #pick(id) {
    this.results.hidden = true;
    this.onPick(id);
  }

  #onKey(event) {
    const count = this.#suggestions.length;

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      this.#active = (this.#active + step + count) % Math.max(1, count);
      this.#markActive();
    } else if (event.key === "Enter" && this.#suggestions[this.#active]) {
      this.#pick(this.#suggestions[this.#active].id);
    } else if (event.key === "Escape") {
      this.results.hidden = true;
    }
  }
}
