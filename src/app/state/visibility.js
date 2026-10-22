import { isFiltering } from "./AppStore.js";

export const edgeId = ({ source, target }) => `${source}->${target}`;

/**
 * Decides how each element looks for the current state (pure function).
 * - `dimmedNodes` / `dimmedEdges`: faded out (filtered out, or unrelated to the selection)
 * - `hotNodes` / `hotEdges`: part of the selection's neighborhood
 */
export function computeVisibility(data, state) {
  const filtering = isFiltering(state);
  const { selectedId } = state;
  const focus = selectedId && data.has(selectedId) ? selectedId : null;
  const near = focus ? new Set([focus, ...data.adjacency.get(focus)]) : null;

  const dimmedNodes = new Set();
  const hotNodes = new Set();
  const hotEdges = new Set();
  const dimmedEdges = new Set();

  for (const node of data.nodes) {
    const filteredOut = filtering && !data.matches(node, state);
    const unrelated = near && !near.has(node.id);

    if (filteredOut || unrelated) {
      dimmedNodes.add(node.id);
    }
  }

  for (const edge of data.edges) {
    const isHot = focus && (edge.source === focus || edge.target === focus);

    if (isHot) {
      hotEdges.add(edgeId(edge));
      hotNodes.add(edge.source);
      hotNodes.add(edge.target);
    } else if (dimmedNodes.has(edge.source) || dimmedNodes.has(edge.target)) {
      dimmedEdges.add(edgeId(edge));
    }
  }

  for (const id of hotNodes) {
    dimmedNodes.delete(id);
  }

  return { focus, dimmedNodes, hotNodes, dimmedEdges, hotEdges };
}
