import { tagColor } from "../lib/color.js";
import { edgeId } from "../state/visibility.js";
import { initialsIcon } from "./icons.js";
import { wrapLabel } from "./labels.js";

const ICON_RENDER_SCALE = 2;
const LABEL_SIDE_SPACE = 80;

/** Converts `GraphData` into Cytoscape elements (nodes keep their precomputed position). */
export function buildElements(data) {
  const nodes = data.nodes.map((node) => ({
    group: "nodes",
    data: {
      id: node.id,
      w: node.w,
      h: node.h,
      textWidth: node.w - LABEL_SIDE_SPACE,
      label: wrapLabel(node.title, node.w - LABEL_SIDE_SPACE),
      iconUrl: initialsIcon(node, data.iconSize * ICON_RENDER_SCALE),
    },
    position: { x: node.x, y: node.y },
  }));

  const edges = data.edges.map((edge) => {
    const shared = data.sharedTag(edge.source, edge.target);

    return {
      group: "edges",
      data: {
        id: edgeId(edge),
        source: edge.source,
        target: edge.target,
        color: shared ? tagColor(shared) : "#777",
      },
    };
  });

  return [...nodes, ...edges];
}

export const ICON_PIXELS = (iconSize) => iconSize * ICON_RENDER_SCALE;
