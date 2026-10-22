import { hueOf } from "../lib/color.js";
import { initials } from "../lib/text.js";

const SCALE = 2;

function drawIcon(size, draw) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size * SCALE;
  const context = canvas.getContext("2d");
  context.scale(SCALE, SCALE);
  context.beginPath();
  context.roundRect(0, 0, size, size, 9);
  context.clip();
  draw(context, size);
  return canvas.toDataURL("image/png");
}

/** Colored square with the initials, used when an entry has no icon (yet). */
export function initialsIcon(node, size) {
  const hue = hueOf(node.tags[0] ?? node.id);

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

/** Loads an image and returns a rounded, center-cropped square data URL. */
export function loadImageIcon(url, size) {
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
