const ITERATIONS = 400;
const ATTRACTION = 0.12;
const CENTERING = 0.004;
const REPULSION = 0.25;
const PADDING = 50;
const REPULSION_RANGE = 260;

function neighborMap(nodes, edges) {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const neighbors = new Map(nodes.map((node) => [node.id, []]));

  for (const { source, target } of edges) {
    neighbors.get(source).push(byId.get(target));
    neighbors.get(target).push(byId.get(source));
  }

  return neighbors;
}

/**
 * Chooses the horizontal position (`x`) of each node: connected nodes attract
 * each other and nearby rows push overlapping cards apart. Rows are already
 * fixed, so only `x` changes. Deterministic.
 */
export function relaxColumns(nodes, edges) {
  const neighbors = neighborMap(nodes, edges);

  nodes.forEach((node, index) => {
    node.x = ((index * 7919) % 9) * 170 - 680;
  });

  for (let iteration = 0; iteration < ITERATIONS; iteration++) {
    const cooling = 1 - iteration / ITERATIONS;
    const shifts = new Map(nodes.map((node) => [node.id, 0]));
    const add = (node, amount) => shifts.set(node.id, shifts.get(node.id) + amount);

    for (const node of nodes) {
      const linked = neighbors.get(node.id);

      if (linked.length > 0) {
        const mean = linked.reduce((sum, other) => sum + other.x, 0) / linked.length;
        add(node, (mean - node.x) * ATTRACTION);
      }

      add(node, -node.x * CENTERING);
    }

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const dy = Math.abs(a.y - b.y);

        if (dy > REPULSION_RANGE) {
          continue;
        }

        const dx = b.x - a.x;
        const overlap = (a.w + b.w) / 2 + PADDING - Math.abs(dx);

        if (overlap > 0) {
          const push = overlap * REPULSION * (1 - dy / (REPULSION_RANGE + 60));
          const direction = dx === 0 ? (i % 2 === 0 ? 1 : -1) : Math.sign(dx);
          add(a, -direction * push);
          add(b, direction * push);
        }
      }
    }

    for (const node of nodes) {
      node.x += shifts.get(node.id) * cooling;
    }
  }

  centerHorizontally(nodes);
}

function centerHorizontally(nodes) {
  const xs = nodes.map((node) => node.x);
  const offset = -(Math.min(...xs) + Math.max(...xs)) / 2;

  for (const node of nodes) {
    node.x = Math.round(node.x + offset);
  }
}
