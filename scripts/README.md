# Scripts

`refresh-passive-tree.ts` pins a passive-tree export from a commit and version you name. It validates that export with the same schema and checksum loader as the app, then checks graph diagnostics, class starts, and high-priority scoring readiness. Only a passing candidate is promoted. The command writes `changelog.md` and keeps the previous `data.json` and `manifest.json` in `previous/`. A failed download, schema check, or optimizer check does not replace the current pin.

```bash
npm run refresh:passive-tree -- --directory <snapshot-dir> --commit <40-hex-sha> --version <version>
npm run refresh:passive-tree -- --directory <snapshot-dir> --rollback
```

The development pin stays at `docs/data-snapshots/passive-tree` until you pass that directory on purpose. Restart a running app after a promote or rollback so it drops its in-memory snapshot.
