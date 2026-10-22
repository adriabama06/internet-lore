export function hash(text) {
  let value = 0;

  for (const char of text) {
    value = (value * 31 + char.codePointAt(0)) >>> 0;
  }

  return value;
}

export function truncate(text, max) {
  const chars = [...text];
  return chars.length > max ? `${chars.slice(0, max).join("").trimEnd()}…` : text;
}

/** Up to two letters used as a preview when an entry has no icon. */
export function initials(title) {
  const words = title.match(/[\p{L}\p{N}]+/gu) ?? [];

  if (words.length === 0) {
    return "?";
  }

  if (words.length === 1) {
    return [...words[0]].slice(0, 2).join("").toUpperCase();
  }

  return words
    .slice(0, 2)
    .map((word) => [...word][0])
    .join("")
    .toUpperCase();
}
