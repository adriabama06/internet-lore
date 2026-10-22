import { daysBetween } from "../../shared/dates.mjs";

const BASE_GAP = 100;
const MAX_EXTRA_GAP = 130;
const EXTRA_GAP_PER_LOG_MONTH = 24;

/**
 * Orders nodes by date and gives each one its own row (`y`).
 * The gap between rows grows logarithmically with the time between them, so
 * decades do not take an entire screen but order and spacing still read as time.
 * Sorts `nodes` in place.
 */
export function assignRows(nodes) {
  nodes.sort((a, b) =>
    a.sortKey === b.sortKey
      ? a.id.localeCompare(b.id)
      : a.sortKey.localeCompare(b.sortKey),
  );

  let y = 0;

  nodes.forEach((node, index) => {
    if (index > 0) {
      const months = daysBetween(nodes[index - 1].sortKey, node.sortKey) / 30;
      y += BASE_GAP + Math.min(MAX_EXTRA_GAP, EXTRA_GAP_PER_LOG_MONTH * Math.log2(1 + months));
    }

    node.y = Math.round(y);
  });
}
