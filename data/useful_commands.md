Cleanup titles to use as folder:
```js
"Stronger than You - Chara response Remake (Undertale Animation Parody)"
  .toLowerCase()
  .replace(/[^a-z0-9 ]/g, "")
  .trim()
  .replace(/ +/g, "_")
```

Overtime the repo will become big, so to clone without downloading the media (Skip LFS):
```bash
GIT_LFS_SKIP_SMUDGE=1 git clone <REPO_URL>
```
