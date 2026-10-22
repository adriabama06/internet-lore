import cytoscape from "cytoscape";
import "./style.css";

const $ = (selector) => document.querySelector(selector);

const escapeHtml = (text) =>
  String(text).replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

const safeUrl = (url) => /^https?:\/\//i.test(url);

function hash(text) {
  let value = 0;
  for (const char of text) {
    value = (value * 31 + char.codePointAt(0)) >>> 0;
  }
  return value;
}

const tagColor = (tag) => `hsl(${hash(tag) % 360} 60% 38%)`;

function formatDate(creation) {
  return creation.split("-").reverse().join("/");
}

function initials(title) {
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

function drawIcon(size, draw) {
  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size * scale;
  const context = canvas.getContext("2d");
  context.scale(scale, scale);
  context.beginPath();
  context.roundRect(0, 0, size, size, 9);
  context.clip();
  draw(context, size);
  return canvas.toDataURL("image/png");
}

function initialsIcon(node, size) {
  const hue = hash(node.tags[0] ?? node.id) % 360;

  return drawIcon(size, (context) => {
    context.fillStyle = `hsl(${hue} 45% 88%)`;
    context.fillRect(0, 0, size, size);
    context.fillStyle = `hsl(${hue} 50% 28%)`;
    context.font = `600 ${size * 0.4}px system-ui, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(initials(node.title), size / 2, size / 2 + 1);
  });
}

function loadImageIcon(url, size) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const side = Math.min(image.naturalWidth, image.naturalHeight);
      const sx = (image.naturalWidth - side) / 2;
      const sy = (image.naturalHeight - side) / 2;
      resolve(
        drawIcon(size, (context) => {
          context.fillStyle = "#fff";
          context.fillRect(0, 0, size, size);
          context.drawImage(image, sx, sy, side, side, 0, 0, size, size);
        }),
      );
    };
    image.onerror = reject;
    image.src = url;
  });
}

function truncate(text, max) {
  const chars = [...text];
  return chars.length > max ? `${chars.slice(0, max).join("").trimEnd()}â€¦` : text;
}

const measure = document.createElement("canvas").getContext("2d");
measure.font = "13px system-ui, sans-serif";

function wrapLabel(text, maxWidth, maxLines = 3) {
  const lines = [];
  let line = "";
  let lastSpace = -1;

  for (const char of text) {
    if (measure.measureText(line + char).width > maxWidth && line !== "") {
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

  if (lines.length > maxLines) {
    return `${lines.slice(0, maxLines).join("\n").trimEnd()}â€¦`;
  }

  return lines.join("\n");
}

async function main() {
  const graph = await (await fetch("graph.json")).json();
  const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
  const neighborIds = new Map(graph.nodes.map((node) => [node.id, new Set()]));

  for (const { source, target } of graph.edges) {
    neighborIds.get(source)?.add(target);
    neighborIds.get(target)?.add(source);
  }

  if (graph.nodes.length === 0) {
    $("#empty").hidden = false;
    $("#empty").textContent = "There are no entries yet.";
  }

  const cy = cytoscape({
    container: $("#cy"),
    layout: { name: "preset" },
    elements: [
      ...graph.nodes.map((node) => ({
        group: "nodes",
        data: {
          id: node.id,
          label: wrapLabel(node.title, node.w - 80),
          w: node.w,
          h: node.h,
          tw: node.w - 80,
          iconUrl: initialsIcon(node, graph.iconSize * 2),
        },
        position: { x: node.x, y: node.y },
      })),
      ...graph.edges.map((edge) => {
        const shared = nodesById
          .get(edge.source)
          .tags.find((tag) => nodesById.get(edge.target).tags.includes(tag));

        return {
          group: "edges",
          data: {
            source: edge.source,
            target: edge.target,
            color: shared ? tagColor(shared) : "#777",
          },
        };
      }),
    ],
    style: [
      {
        selector: "node",
        style: {
          shape: "round-rectangle",
          width: "data(w)",
          height: "data(h)",
          "background-color": "#fff",
          "border-width": 3,
          "border-color": "#1a1a1a",
          label: "data(label)",
          color: "#1a1a1a",
          "font-size": 13,
          "text-wrap": "wrap",
          "text-max-width": "data(tw)",
          "text-valign": "center",
          "text-halign": "center",
          "text-margin-x": 30,
          "background-image": "data(iconUrl)",
          "background-fit": "none",
          "background-clip": "none",
          "background-width": graph.iconSize,
          "background-height": graph.iconSize,
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
      { selector: "node.hot", style: { "border-color": "#2b7a3d" } },
      { selector: "node.picked", style: { "border-width": 4, "border-color": "#2b7a3d" } },
      { selector: ".dim", style: { opacity: 0.12 } },
    ],
    wheelSensitivity: 0.25,
    minZoom: 0.05,
    maxZoom: 2.5,
    boxSelectionEnabled: false,
    autoungrabify: true,
  });

  const fit = () => {
    cy.fit(undefined, 70);

    if (cy.zoom() > 1) {
      cy.zoom({ level: 1, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } });
      cy.center();
    }
  };

  fit();
  const repaint = () => {
    cy.style().update();
    cy.forceRender();
  };
  setTimeout(repaint, 150);
  setTimeout(repaint, 800);
  $("#fit").addEventListener("click", fit);

  for (const node of graph.nodes) {
    if (!node.icon) {
      continue;
    }

    loadImageIcon(node.icon, graph.iconSize * 2)
      .then((url) => {
        cy.getElementById(node.id).data("iconUrl", url);
        setTimeout(repaint, 50);
      })
      .catch(() => {});
  }

  /* ---- Year axis ---- */

  const axis = $("#axis");
  const yearAnchors = new Map();

  for (const node of graph.nodes) {
    if (!yearAnchors.has(node.year) || node.y < yearAnchors.get(node.year)) {
      yearAnchors.set(node.year, node.y);
    }
  }

  const yearLabels = [...yearAnchors]
    .sort((a, b) => a[1] - b[1])
    .map(([year, y]) => {
      const label = document.createElement("div");
      label.className = "year";
      label.textContent = year;
      axis.append(label);
      return { y, label };
    });

  function updateAxis() {
    const { y: panY } = cy.pan();
    const zoom = cy.zoom();
    let last = -Infinity;

    for (const { y, label } of yearLabels) {
      const screenY = y * zoom + panY;
      const visible = screenY > 8 && screenY < cy.height() - 14 && screenY - last > 18;
      label.style.display = visible ? "" : "none";

      if (visible) {
        label.style.top = `${screenY}px`;
        last = screenY;
      }
    }
  }

  cy.on("viewport resize", updateAxis);
  updateAxis();

  /* ---- Filters ---- */

  const activeTags = new Set();
  let query = "";
  let selectedId = null;

  function matches(node) {
    const text = `${node.title} ${node.description} ${node.tags.join(" ")} ${node.creation}`.toLowerCase();
    return (
      (query === "" || text.includes(query)) &&
      [...activeTags].every((tag) => node.tags.includes(tag))
    );
  }

  function refresh() {
    const filtering = query !== "" || activeTags.size > 0;
    const focus = selectedId ? cy.getElementById(selectedId) : null;
    const focusSet = focus ? focus.closedNeighborhood() : null;

    cy.batch(() => {
      cy.elements().removeClass("dim hot picked");

      cy.nodes().forEach((element) => {
        const hidden = filtering && !matches(nodesById.get(element.id()));
        element.toggleClass("dim", hidden || Boolean(focusSet && !focusSet.contains(element)));
      });

      cy.edges().forEach((edge) => {
        const visible = !edge.source().hasClass("dim") && !edge.target().hasClass("dim");
        edge.toggleClass("dim", !visible);
      });

      if (focus && focus.nonempty()) {
        focus.addClass("picked");
        focus.connectedEdges().forEach((edge) => {
          edge.removeClass("dim").addClass("hot");
          edge.connectedNodes().removeClass("dim").addClass("hot");
        });
      }
    });
  }

  const tagBar = $("#tags");

  for (const tag of graph.tags) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.textContent = tag;
    chip.style.setProperty("--tag", tagColor(tag));
    chip.addEventListener("click", () => {
      activeTags.has(tag) ? activeTags.delete(tag) : activeTags.add(tag);
      chip.classList.toggle("on", activeTags.has(tag));
      refresh();
    });
    tagBar.append(chip);
  }

  /* ---- Search ---- */

  const search = $("#search");
  const results = $("#results");
  let resultIds = [];
  let activeResult = -1;

  function renderResults() {
    results.replaceChildren();
    const text = search.value.trim().toLowerCase();
    resultIds = text
      ? graph.nodes.filter((node) => `${node.title} ${node.tags.join(" ")}`.toLowerCase().includes(text)).slice(0, 8).map((node) => node.id)
      : [];
    activeResult = resultIds.length > 0 ? 0 : -1;
    results.hidden = resultIds.length === 0;

    resultIds.forEach((id, index) => {
      const node = nodesById.get(id);
      const item = document.createElement("li");
      item.classList.toggle("active", index === activeResult);
      item.innerHTML = `<span>${escapeHtml(truncate(node.title, 44))}</span><span>${node.year}</span>`;
      item.addEventListener("mousedown", (event) => {
        event.preventDefault();
        choose(id);
      });
      results.append(item);
    });
  }

  function choose(id) {
    results.hidden = true;
    select(id, true);
  }

  search.addEventListener("input", () => {
    query = search.value.trim().toLowerCase();
    renderResults();
    refresh();
  });

  search.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      activeResult = (activeResult + step + resultIds.length) % Math.max(1, resultIds.length);
      [...results.children].forEach((item, index) => item.classList.toggle("active", index === activeResult));
    } else if (event.key === "Enter" && resultIds[activeResult]) {
      choose(resultIds[activeResult]);
    } else if (event.key === "Escape") {
      results.hidden = true;
    }
  });

  search.addEventListener("blur", () => {
    results.hidden = true;
  });

  /* ---- Tooltip ---- */

  const tooltip = $("#tooltip");

  function showTooltip(node, element) {
    const links = node.urls.filter(safeUrl).slice(0, 3);
    const images = node.media.filter((item) => item.kind === "image").slice(0, 4);

    tooltip.innerHTML = `
      <div class="date">${formatDate(node.creation)} (Day/Month/Year)</div>
      <p>${escapeHtml(truncate(node.description, 280))}</p>
      ${links.length ? `<h4>Links:</h4><div class="links">${links.map((url) => escapeHtml(url)).join("<br>")}</div>` : ""}
      ${images.length ? `<h4>Media:</h4><div class="thumbs">${images.map((item) => `<img src="${escapeHtml(item.url)}" alt="" loading="lazy">`).join("")}</div>` : ""}
    `;
    tooltip.hidden = false;

    const box = element.renderedBoundingBox();
    const stage = $("#stage").getBoundingClientRect();
    const width = tooltip.offsetWidth;
    const height = tooltip.offsetHeight;
    let left = box.x2 + 12;

    if (left + width > stage.width - 8) {
      left = Math.max(70, box.x1 - width - 12);
    }

    const top = Math.min(Math.max(8, box.y1), Math.max(8, stage.height - height - 8));
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  }

  const hideTooltip = () => {
    tooltip.hidden = true;
  };

  cy.on("mouseover", "node", (event) => showTooltip(nodesById.get(event.target.id()), event.target));
  cy.on("mouseout", "node", hideTooltip);
  cy.on("viewport", hideTooltip);

  cy.on("mouseover", "node", () => {
    $("#cy").style.cursor = "pointer";
  });
  cy.on("mouseout", "node", () => {
    $("#cy").style.cursor = "";
  });

  /* ---- Details ---- */

  const details = $("#details");

  function renderDetails(node) {
    const links = node.urls.filter(safeUrl);
    const related = [...neighborIds.get(node.id)]
      .map((id) => nodesById.get(id))
      .sort((a, b) => a.sortDate.localeCompare(b.sortDate));

    const media = node.media
      .map((item) => {
        const url = escapeHtml(item.url);
        const caption = `<div class="caption">${escapeHtml(item.name)}</div>`;

        if (item.kind === "image") {
          return `<a href="${url}" target="_blank" rel="noopener"><img src="${url}" alt="${escapeHtml(item.name)}" loading="lazy"></a>`;
        }

        if (item.kind === "video") {
          return `<video src="${url}" controls preload="metadata"></video>${caption}`;
        }

        if (item.kind === "audio") {
          return `<audio src="${url}" controls preload="none"></audio>${caption}`;
        }

        return `<div class="caption"><a href="${url}" target="_blank" rel="noopener">${escapeHtml(item.name)}</a></div>`;
      })
      .join("");

    details.innerHTML = `
      <button class="close" type="button" aria-label="Close">Ã—</button>
      <h2>${escapeHtml(node.title)}</h2>
      <div class="date">${formatDate(node.creation)} (Day/Month/Year)</div>
      <div class="tags">${node.tags
        .map((tag) => `<span class="chip" style="--tag:${tagColor(tag)}">${escapeHtml(tag)}</span>`)
        .join("")}</div>
      <p class="desc">${escapeHtml(node.description)}</p>
      ${links.length ? `<h3>Links</h3><ul>${links.map((url) => `<li><a href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(url)}</a></li>`).join("")}</ul>` : ""}
      ${related.length ? `<h3>Connected to</h3><ul>${related.map((other) => `<li><button class="link" type="button" data-id="${escapeHtml(other.id)}">${escapeHtml(other.title)}</button> (${formatDate(other.creation)})</li>`).join("")}</ul>` : ""}
      ${media ? `<h3>Media</h3><div class="media">${media}</div>` : ""}
    `;
  }

  details.addEventListener("click", (event) => {
    if (event.target.closest(".close")) {
      select(null);
    }

    const link = event.target.closest("button.link");

    if (link) {
      select(link.dataset.id, true);
    }
  });

  function select(id, center = false) {
    if (id && !nodesById.has(id)) {
      id = null;
    }

    for (const media of details.querySelectorAll("video, audio")) {
      media.pause();
    }

    selectedId = id;
    hideTooltip();

    if (id) {
      renderDetails(nodesById.get(id));
      details.scrollTop = 0;
      details.hidden = false;

      if (center) {
        const element = cy.getElementById(id);
        const zoom = Math.max(cy.zoom(), 0.9);
        const offset = window.innerWidth > 900 ? -220 : 0;
        cy.animate({
          zoom,
          pan: {
            x: cy.width() / 2 + offset - element.position("x") * zoom,
            y: cy.height() / 2 - element.position("y") * zoom,
          },
          duration: 350,
        });
      }

      history.replaceState(null, "", `#${id}`);
    } else {
      details.hidden = true;
      history.replaceState(null, "", location.pathname + location.search);
    }

    refresh();
  }

  cy.on("tap", "node", (event) => select(event.target.id()));
  cy.on("tap", (event) => {
    if (event.target === cy) {
      select(null);
    }
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && document.activeElement !== search) {
      select(null);
    }
  });

  const fromHash = () => {
    const id = decodeURIComponent(location.hash.slice(1));

    if (id && id !== selectedId && nodesById.has(id)) {
      select(id, true);
    }
  };

  window.addEventListener("hashchange", fromHash);
  fromHash();

  window.addEventListener("resize", () => cy.resize());
}

main().catch((error) => {
  console.error(error);
  const message = $("#empty");
  message.hidden = false;
  message.textContent = "Could not load the map data.";
});
