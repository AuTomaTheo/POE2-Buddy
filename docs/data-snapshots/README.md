# Data snapshots

Pinned game-data snapshots live here so tests do not download them on every run.

`passive-tree/` is the official GGG `poe2-skilltree-export` file `data.json`, plus `manifest.json` with the commit, version, fetch time, and sha256 checksum. This folder is the development pin and the provenance record. Production runtime must be given an explicit snapshot directory. It does not fetch the tree during a normal request, and it does not treat this docs path as a default.

A refresh is a separate command. It downloads one named commit, checks the export schema and checksum, then checks optimizer compatibility. Only a passing candidate replaces `data.json` and `manifest.json`. The replaced files are kept in `previous/`. Rollback swaps `previous/` back into place after the stored snapshot validates. It does not apply the newer compatibility gate:

```bash
npm run refresh:passive-tree -- --directory docs/data-snapshots/passive-tree --commit <40-hex-sha> --version <version>
npm run refresh:passive-tree -- --directory docs/data-snapshots/passive-tree --rollback
```

Do not run the first command unless that commit and version are the snapshot you intend to approve. A rejected download or schema leaves the current pin where it is. After a promote or rollback, restart the app so it reloads the files. The approved pin in this folder remains version 0.5.5, commit `bd87e6512c92b868542eddfb1ba4ea8b6dc2da36`, until such a command is run.
