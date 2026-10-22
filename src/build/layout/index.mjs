import { relaxColumns } from "./columns.mjs";
import { assignRows } from "./rows.mjs";

/** Sets `x` and `y` on every node (and sorts them by date). */
export function layoutGraph(nodes, edges) {
  assignRows(nodes);

  if (nodes.length > 0) {
    relaxColumns(nodes, edges);
  }
}
