const FONT = "13px system-ui, sans-serif";
let context;

function measure(text) {
  context ??= Object.assign(document.createElement("canvas").getContext("2d"), { font: FONT });
  return context.measureText(text).width;
}

/**
 * Inserts line breaks so the text fits `maxWidth`. Breaks at spaces when it
 * can and between any characters otherwise (Japanese has no spaces).
 */
export function wrapLabel(text, maxWidth, maxLines = 3) {
  const lines = [];
  let line = "";
  let lastSpace = -1;

  for (const char of text) {
    if (line !== "" && measure(line + char) > maxWidth) {
      if (lastSpace > 0 && char !== " ") {
        lines.push(line.slice(0, lastSpace));
        line = line.slice(lastSpace + 1);
      } else {
        lines.push(line);
        line = "";
      }

      lastSpace = -1;
    }

    if (char === " " && line === "") {
      continue;
    }

    if (char === " ") {
      lastSpace = line.length;
    }

    line += char;
  }

  lines.push(line);

  return lines.length > maxLines
    ? `${lines.slice(0, maxLines).join("\n").trimEnd()}…`
    : lines.join("\n");
}
