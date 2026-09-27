# STEP-012 — Data refresh and version pipeline

**Date:** 2026-09-26  
**Status:** COMPLETE  
**Roadmap reference:** Phase 4 / STEP-012  
**Authoring context:** Cursor-assisted development

## 1. Objective

Add a passive-tree refresh command that downloads one named commit, validates it before replacing the current snapshot, keeps the previous snapshot, and writes a changelog. A broken download must not become the current pin. Do not start STEP-013.

## 2. Acceptance criteria

- [x] A script can fetch and pin an approved passive-tree snapshot
- [x] The export schema is validated before the current snapshot is replaced
- [x] The previous snapshot is retained for rollback
- [x] A new data version appends a changelog
- [x] A broken snapshot is never auto-promoted
- [x] The data update can be tested without the network and without changing the approved pin
- [x] Rollback is documented
- [x] Optimizer results still record the snapshot version
- [x] Required repository checks pass

## 3. Implementation summary

`npm run refresh:passive-tree` requires a snapshot directory, a 40-character commit, and a version. It downloads that commit's `data.json` from the public `grindinggear/poe2-skilltree-export` repository, parses it, and runs the existing `normalizeSkillTreeExport` and `loadPinnedPassiveTreeSnapshot` checks. Only after both succeed does it copy the current pin into `previous/` and write the new `data.json`, `manifest.json`, and a `changelog.md` entry. Invalid JSON, a schema failure, a duplicate skill id, or an incomplete current pin leaves the current files unchanged. `--rollback` restores `previous/` after validating it, and keeps the replaced pin as the new previous generation.

The approved development pin was not refreshed. It is still version 0.5.5, commit `bd87e6512c92b868542eddfb1ba4ea8b6dc2da36`, checksum `sha256:b52be9c4f17e4114064255ef1b8c58292e9db0e395d95af235a8d3fef0d44642`. Tests use a temporary directory and a stand-in download. Recommendation results already copy the loaded snapshot into `dataVersion`; that path was left in place.

## 4. Files created

| File                                                              | Purpose                                                         |
| ----------------------------------------------------------------- | --------------------------------------------------------------- |
| `packages/data-sources/src/passive-tree/refresh-snapshot.ts`      | Validate, promote, roll back, and parse the refresh command     |
| `packages/data-sources/src/passive-tree/refresh-snapshot.test.ts` | Temporary-directory checks for rejection, promote, and rollback |
| `scripts/refresh-passive-tree.ts`                                 | Command entry that calls the data-sources pipeline              |
| `docs/progress/STEP-012-data-refresh-version-pipeline.md`         | This record                                                     |

## 5. Files changed

| File                                 | Change                                                   |
| ------------------------------------ | -------------------------------------------------------- |
| `packages/data-sources/src/index.ts` | Exports the refresh and rollback functions               |
| `package.json`                       | Adds `refresh:passive-tree` and the `tsx` dev dependency |
| `package-lock.json`                  | Locks `tsx`                                              |
| `tsconfig.json`                      | Typechecks `scripts/**/*.ts`                             |
| `scripts/README.md`                  | Documents the refresh and rollback commands              |
| `docs/data-snapshots/README.md`      | Documents how to promote and roll back a directory       |
| `packages/data-sources/README.md`    | Notes that a refresh keeps one previous generation       |
| `README.md`                          | Points at the refresh command                            |
| `docs/planning/DECISION_LOG.md`      | Adds D-063                                               |

## 6. Files deleted

`None`

## 7. Important code paths / responsibilities

`refreshPassiveTreeSnapshot` owns the download, schema gate, checksum reload, previous-pin copy, and changelog entry. `rollbackPassiveTreeSnapshot` owns the reverse swap and refuses a previous pin that fails validation. `parseRefreshArgs` and `runPassiveTreeRefreshCli` own the command line. `scripts/refresh-passive-tree.ts` only starts that command. `normalizeSkillTreeExport` and `loadPinnedPassiveTreeSnapshot` remain the schema and checksum checks. The optimizer still records `dataVersion` from the snapshot it loaded.

## 8. External APIs / data sources involved

- Provider: Grinding Gear Games, public repository `https://github.com/grindinggear/poe2-skilltree-export`
- Endpoint: `https://raw.githubusercontent.com/grindinggear/poe2-skilltree-export/<commit>/data.json`
- Official
- Auth: none
- Field used: the raw `data.json` bytes, plus the commit and version supplied to the command
- Cache: the command writes a directory. It does not run during an analysis request
- Version: the approved development pin is unchanged, version 0.5.5, commit `bd87e6512c92b868542eddfb1ba4ea8b6dc2da36`, fetched at `2026-09-26T14:45:00.000Z`
- Fallback: a failed download or validation does not replace the current pin

## 9. Credentials / environment variables

### Added/changed variable names

`None`

### Credential status

NOT REQUIRED

## 10. Data model / schema changes

No scoring, path, or domain schema change. A snapshot directory can now also contain `previous/data.json`, `previous/manifest.json`, and `changelog.md`. The current manifest fields are unchanged: source, version, commit, fetchedAt, checksum, and file.

## 11. Commands executed

```bash
npm install -D tsx
npm run format
npm test
npm run typecheck
npm run lint
npm audit
npm run format:check
npm run refresh:passive-tree
```

`npm run refresh:passive-tree` with no arguments exits 1 and prints usage. It does not download a tree.

## 12. Automated tests

| Command/Test                                         | Result | Notes                                                                                                                                                                              |
| ---------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm test`                                           | PASS   | 21 files, 134 tests                                                                                                                                                                |
| `packages/data-sources/.../refresh-snapshot.test.ts` | PASS   | Rejects invalid JSON, a bad commit, a schema failure, and a duplicate skill id without replacing the current files. Promotes a valid export, writes the changelog, and rolls back. |
| `npm run typecheck`                                  | PASS   | Root, web, domain, data-sources, passive-engine, scoring-engine                                                                                                                    |
| `npm run lint`                                       | PASS   | Exit 0                                                                                                                                                                             |
| `npm run format:check`                               | PASS   | Exit 0                                                                                                                                                                             |
| `npm audit`                                          | PASS   | 0 vulnerabilities after adding `tsx`                                                                                                                                               |

## 13. Manual verification

Ran `npm run refresh:passive-tree` with no arguments. It printed the usage text and exited 1. `git diff --stat -- docs/data-snapshots/passive-tree` was empty, so the approved pin was not rewritten. No analysis-screen behavior changed, so the browser was not used. The screen still receives `dataVersion` from the loaded snapshot.

## 14. Errors/issues encountered

- Symptom: `tsx scripts/refresh-passive-tree.ts` failed with `Top-level await is currently not supported with the "cjs" output format`.
- Root cause: the repository root is not `"type": "module"`, so tsx compiled the script as CommonJS.
- Attempts: one.
- Final resolution: the script waits on the returned promise instead of using top-level await.
- Regression test added? The pipeline function is covered by Vitest. The tsx wrapper was checked by running the command with no arguments.

## 15. Security/privacy impact

The download uses the public export and no credential. The default fetch refuses a final URL outside `https://raw.githubusercontent.com/grindinggear/poe2-skilltree-export/`. The command does not read character accounts or write secrets. Tests do not contact GitHub.

## 16. Performance impact

Not on the analysis request path. A refresh downloads one `data.json` only when someone runs the command. The in-memory snapshot cache is unchanged and still lives until process restart.

## 17. Data provenance / reproducibility impact

The development pin, fixture source versions, and recorded recommendation `dataVersion` values stay on 0.5.5 / `bd87e6512c92b868542eddfb1ba4ea8b6dc2da36` / `sha256:b52be9c4f17e4114064255ef1b8c58292e9db0e395d95af235a8d3fef0d44642`. A future promote records the new version, commit, checksum, and fetch time in `manifest.json` and `changelog.md`. Analysis of that directory then reports that snapshot version. Checksums are computed from the downloaded bytes, not from a re-serialized JSON document.

## 18. Known limitations

- The command does not pick the latest GitHub branch. The operator names the commit and version.
- Only one previous generation is kept.
- A running app keeps the cached snapshot until restart.
- Promoting a new official commit without updating fixture source versions makes those fixtures source-incompatible.
- poe.ninja and other sources are not refreshed here.
- The default test suite does not call GitHub.

## 19. Decisions made

D-063. A refresh promotes a snapshot only after the existing schema and checksum checks succeed. The approved 0.5.5 pin stays in place until the command is pointed at that directory. Tests use a temporary directory. `dataVersion` on a recommendation remains the loaded snapshot.

## 20. Deviations from planning docs

The roadmap says to pin the latest approved source snapshots. This step treats "approved" as the commit and version passed to the command. It does not replace `docs/data-snapshots/passive-tree` with whatever is currently on the repository default branch. Only the passive-tree export is in this pipeline. `tsx` was added so the TypeScript command can run.

## 21. Remaining risks

Promoting a new commit into the development pin, then analyzing an old fixture, fails the source check until the fixture is updated to that commit. A crash during the final file copy is restored from `previous/` when that copy is still intact. Only the immediately previous pin can be restored.

## 22. Rollback notes

To undo a promoted snapshot, run:

```bash
npm run refresh:passive-tree -- --directory <snapshot-dir> --rollback
```

That validates `previous/`, swaps it back to `data.json` and `manifest.json`, and appends a changelog entry. Restart the app afterward. The in-process cache does not notice the file change by itself.

The approved development pin was not changed, so it does not need a data rollback. To remove this step's code, delete the refresh module, the script, the `refresh:passive-tree` script, and the `tsx` dev dependency, then reinstall from the lockfile. Do not delete `docs/data-snapshots/passive-tree`.

## 23. Recommended next step

STEP-013, community price-data access through poe.ninja, after explicit approval. Do not start it as part of this step.

## 24. Completion statement

STEP-012 satisfies the acceptance criteria. The refresh command validates before replacing a pin, keeps one previous snapshot, writes a changelog, and can be tested on a temporary directory. The approved 0.5.5 pin is unchanged, and optimizer results still record the snapshot version they loaded.
