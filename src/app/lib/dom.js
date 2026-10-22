export const $ = (selector, root = document) => root.querySelector(selector);

export function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

/** Entry URLs come from contributions: only allow http(s) links. */
export function isHttpUrl(url) {
  return /^https?:\/\//i.test(url);
}
