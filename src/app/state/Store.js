/** Minimal observable state container. */
export class Store {
  #state;
  #listeners = new Set();

  constructor(initial) {
    this.#state = initial;
  }

  get state() {
    return this.#state;
  }

  set(patch) {
    const previous = this.#state;
    this.#state = { ...previous, ...patch };
    this.#listeners.forEach((listener) => listener(this.#state, previous));
  }

  /** @returns {() => void} unsubscribe */
  subscribe(listener) {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }
}
