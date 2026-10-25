Cleanup titles to use as folder:
```js
"Stronger than You - Chara response Remake (Undertale Animation Parody)"
  .toLowerCase()
  .replace(/[^a-z0-9 ]/g, "")
  .trim()
  .replace(/ +/g, "_")
```