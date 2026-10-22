const INK = "#1a1a1a";
const ACCENT = "#2b7a3d";

export function buildStyle(iconSize) {
  return [
    {
      selector: "node",
      style: {
        shape: "round-rectangle",
        width: "data(w)",
        height: "data(h)",
        "background-color": "#fff",
        "border-width": 3,
        "border-color": INK,
        label: "data(label)",
        color: INK,
        "font-size": 13,
        "text-wrap": "wrap",
        "text-max-width": "data(textWidth)",
        "text-valign": "center",
        "text-halign": "center",
        "text-margin-x": 30,
        "background-image": "data(iconUrl)",
        "background-fit": "none",
        "background-clip": "none",
        "background-width": iconSize,
        "background-height": iconSize,
        "background-position-x": 5,
        "background-position-y": "50%",
      },
    },
    {
      selector: "edge",
      style: {
        "curve-style": "taxi",
        "taxi-direction": "vertical",
        "taxi-radius": 60,
        "line-color": "data(color)",
        width: 3,
        opacity: 0.4,
      },
    },
    { selector: "edge.hot", style: { opacity: 0.95, width: 4 } },
    { selector: "node.hot", style: { "border-color": ACCENT } },
    { selector: "node.picked", style: { "border-width": 4, "border-color": ACCENT } },
    { selector: ".dim", style: { opacity: 0.12 } },
  ];
}
