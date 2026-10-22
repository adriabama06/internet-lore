/** Partial ISO dates: `YYYY`, `YYYY-MM` or `YYYY-MM-DD`. */

/** Full `YYYY-MM-DD` string that sorts lexicographically. */
export function sortKey(creation) {
  const [year, month = "01", day = "01"] = creation.split("-");
  return `${year}-${month}-${day}`;
}

export function yearOf(creation) {
  return Number(creation.slice(0, 4));
}

export function daysBetween(sortKeyA, sortKeyB) {
  return Math.max(0, (Date.parse(sortKeyB) - Date.parse(sortKeyA)) / 86400000);
}

/** `1995-08-15` -> `15/08/1995` (Day/Month/Year). */
export function formatDate(creation) {
  return creation.split("-").reverse().join("/");
}
