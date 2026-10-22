import { formatDate } from "../../shared/dates.mjs";
import { tagColor } from "../lib/color.js";
import { escapeHtml, isHttpUrl } from "../lib/dom.js";
import { truncate } from "../lib/text.js";

const TOOLTIP_DESCRIPTION_CHARS = 280;
const TOOLTIP_MAX_LINKS = 3;
const TOOLTIP_MAX_IMAGES = 4;

const dateLine = (node) =>
  `<div class="date">${formatDate(node.creation)} (Day/Month/Year)</div>`;

const tagChip = (tag) =>
  `<span class="chip" style="--tag:${tagColor(tag)}">${escapeHtml(tag)}</span>`;

export function tooltipHtml(node) {
  const links = node.urls.filter(isHttpUrl).slice(0, TOOLTIP_MAX_LINKS);
  const images = node.media.filter((item) => item.kind === "image").slice(0, TOOLTIP_MAX_IMAGES);

  return `
    ${dateLine(node)}
    <p>${escapeHtml(truncate(node.description, TOOLTIP_DESCRIPTION_CHARS))}</p>
    ${
      links.length
        ? `<h4>Links:</h4><div class="links">${links.map(escapeHtml).join("<br>")}</div>`
        : ""
    }
    ${
      images.length
        ? `<h4>Media:</h4><div class="thumbs">${images
            .map((item) => `<img src="${escapeHtml(item.url)}" alt="" loading="lazy">`)
            .join("")}</div>`
        : ""
    }
  `;
}

function mediaHtml(item) {
  const url = escapeHtml(item.url);
  const name = escapeHtml(item.name);
  const caption = `<div class="caption">${name}</div>`;

  switch (item.kind) {
    case "image":
      return `<a href="${url}" target="_blank" rel="noopener"><img src="${url}" alt="${name}" loading="lazy"></a>`;
    case "video":
      return `<video src="${url}" controls preload="metadata"></video>${caption}`;
    case "audio":
      return `<audio src="${url}" controls preload="none"></audio>${caption}`;
    default:
      return `<div class="caption"><a href="${url}" target="_blank" rel="noopener">${name}</a></div>`;
  }
}

const section = (title, content) => (content ? `<h3>${title}</h3>${content}` : "");

export function detailsHtml(node, neighbors) {
  const links = node.urls.filter(isHttpUrl);

  const linkList = links.length
    ? `<ul>${links
        .map((url) => `<li><a href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(url)}</a></li>`)
        .join("")}</ul>`
    : "";

  const connections = neighbors.length
    ? `<ul>${neighbors
        .map(
          (other) =>
            `<li><button class="link" type="button" data-id="${escapeHtml(other.id)}">${escapeHtml(other.title)}</button> (${formatDate(other.creation)})</li>`,
        )
        .join("")}</ul>`
    : "";

  const media = node.media.length
    ? `<div class="media">${node.media.map(mediaHtml).join("")}</div>`
    : "";

  return `
    <button class="close" type="button" aria-label="Close">×</button>
    <h2>${escapeHtml(node.title)}</h2>
    ${dateLine(node)}
    <div class="tags">${node.tags.map(tagChip).join("")}</div>
    <p class="desc">${escapeHtml(node.description)}</p>
    ${section("Links", linkList)}
    ${section("Connected to", connections)}
    ${section("Media", media)}
  `;
}
