/** Keeps the selected entry id in the URL hash (`#1995/touhou`) so it can be shared. */
export class HashRouter {
  read() {
    try {
      return decodeURIComponent(location.hash.slice(1)) || null;
    } catch {
      return null;
    }
  }

  write(id) {
    history.replaceState(null, "", id ? `#${id}` : location.pathname + location.search);
  }

  onChange(callback) {
    window.addEventListener("hashchange", () => callback(this.read()));
  }
}
