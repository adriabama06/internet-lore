import { hash } from "./text.js";

export const hueOf = (text) => hash(text) % 360;

/** Comma syntax on purpose: Cytoscape does not parse the space-separated form. */
export const tagColor = (tag) => `hsl(${hueOf(tag)}, 60%, 38%)`;
