# STEP-018B.1 — Delta fidelity and item-candidate readiness

**Date:** 2026-09-27  
**Status:** COMPLETE  
**Roadmap reference:** Phase 3 / STEP-018B.1  
**Authoring context:** Cursor-assisted development

## 1. Objective

Prove that a character-aware passive delta measured the exact requested candidate, pin the calculation-relevant PoB2 runtime instead of only the executable, state the network boundary that is actually enforced, and add a minimal explicit item-replacement delta. This step does not rank upgrades.

## 2. Acceptance criteria

- [x] Passive evaluation verifies the exact newly allocated node set.
- [x] Unexpected auto-path nodes cause structured `candidate-allocation-mismatch`.
- [x] Server-side point cost is recomputed or verified.
- [x] Allocation mode is verified.
- [x] The result records requested, verified, and actually allocated node ids.
- [x] Runtime integrity covers calculation-relevant Lua, data, and tree files.
- [x] The runtime fingerprint is included in calculation provenance.
- [x] A runtime fingerprint mismatch fails closed.
- [x] Network policy documentation distinguishes the localhost protocol from OS-level outbound blocking.
- [x] Known PoB auto-update remains disabled.
- [x] A minimal explicit item-replacement delta API exists.
- [x] Item replacement uses an explicit slot and raw item text.
- [x] Item mutation restores the original equipped item and baseline metrics.
- [x] Item delta uses the same named metric and delta model as passive delta.
- [x] No item search, scoring, ranking, pricing, or recommendation.
- [x] Default tests still require no PoB2 executable.
- [x] Opt-in PoB2 tests cover passive exactness and one item replacement.
- [x] Passive heuristic ranking remains unchanged.
- [x] Gear normalization remains unchanged.
- [x] CharacterContext remains unchanged.

## 3. Implementation summary

The calculator now rejects a passive result unless the nodes newly allocated by PoB2 are exactly the requested ids. A requested id that is already allocated, a missing id, or an extra path node is `candidate-allocation-mismatch`. The worker restores the build first. If the restore metrics differ, the result is `restore-failed` and the worker is discarded. A clean restore keeps the worker and does not expose a successful delta.

The web adapter reruns passive analysis for the submitted PoB2 code, objective, and point budget. It accepts the candidate only when that node set is one of the server's recommendations and the claimed point cost equals that recommendation's point cost. The calculator stores `verifiedPointCost`. It does not import the passive engine.

The prepared runtime is identified by `runtimeFingerprint`, a SHA-256 over the executable, top-level DLLs, `manifest.xml`, `Launch.lua`, `GameVersions.lua`, and the `Modules`, `Classes`, `Data`, `TreeData`, and `lua` trees. The worker checks that fingerprint once before it listens or spawns, and again after it is discarded. A mismatch throws `runtime-integrity-mismatch` and does not calculate.

`evaluateItemReplacement` sends one slot and one raw item text. The worker adds the item without auto-equip, selects it, calculates, selects the previous item, deletes the candidate, and checks that the slot and the metrics match the baseline. The public result has checksums and named deltas. It has no score, price, or recommendation.

Adapter version and protocol version are both 2. The passive screen shows the verified point cost, the three node lists, allocation verification, and the runtime fingerprint. The heuristic list is unchanged. There is no item-delta screen.

## 4. Files created

| File                                                                       | Purpose                                              |
| -------------------------------------------------------------------------- | ---------------------------------------------------- |
| `packages/pob2-calculator/src/fingerprint.ts`                              | Runtime fingerprint include rules and aggregate hash |
| `packages/pob2-calculator/src/fingerprint.test.ts`                         | Temp-directory fingerprint tests                     |
| `packages/pob2-calculator/src/fingerprint-cli.ts`                          | Prints a fingerprint for the prepare script          |
| `packages/pob2-calculator/src/items.ts`                                    | Explicit slot map and raw-text checks                |
| `tests/passive-delta-candidate.test.ts`                                    | Server point-cost membership check                   |
| `docs/progress/STEP-018B-1-delta-fidelity-and-item-candidate-readiness.md` | This record                                          |

## 5. Files changed

| File                                                   | Change                                                            |
| ------------------------------------------------------ | ----------------------------------------------------------------- |
| `packages/pob2-calculator/src/metrics.ts`              | Adapter and protocol versions are 2                               |
| `packages/pob2-calculator/src/errors.ts`               | New closed-failure codes and messages                             |
| `packages/pob2-calculator/src/protocol.ts`             | Protocol 2 and the allocation report                              |
| `packages/pob2-calculator/src/evaluate.ts`             | Exact allocation check, verified point cost, item replacement     |
| `packages/pob2-calculator/src/worker.ts`               | Manifest fingerprint and a check before spawn                     |
| `packages/pob2-calculator/src/index.ts`                | Exports for the new functions                                     |
| `packages/pob2-calculator/runtime/Pob2BuddyWorker.lua` | Protocol 2, exact allocation, item replacement                    |
| `packages/pob2-calculator/src/calculator.test.ts`      | Mismatch, point-cost, and item cases                              |
| `packages/pob2-calculator/src/worker.test.ts`          | Fingerprint once per start, mismatch before spawn                 |
| `scripts/prepare-pob2-runtime.mjs`                     | Protocol 2, fingerprint, worker starts at the beginning of `Init` |
| `apps/web/src/server/measure-passive-delta.ts`         | Revalidates the candidate before the worker                       |
| `apps/web/src/app/actions.ts`                          | Passes objective and point budget                                 |
| `apps/web/src/app/character-delta.tsx`                 | Shows verified identity and the fingerprint                       |
| `apps/web/src/app/analysis-screen.tsx`                 | Passes the submitted objective and budget                         |
| `tests/pob2-calculator.integration.test.ts`            | Exact passive ids, one multi-node path, fixture F helmet          |
| `docs/planning/DECISION_LOG.md`                        | D-082, and a supersession note on D-081                           |

## 6. Files deleted

None.

## 7. Important code paths / responsibilities

`selectVerifiedPassiveCandidate` in the web adapter is the only point-cost authority used before a worker call. `claimedPointCostMatches` in the calculator package checks that the claimed integer equals the verified integer. `evaluatePassiveCandidate` sends protocol version 2 and refuses a successful delta when the allocated set differs. `Pob2BuddyWorker.lua` captures the baseline allocation, allocates only in the requested mode, and returns `candidate-allocation-mismatch` when the new set is not the requested set. `runtimeFingerprint` defines the pin. `IsolatedPob2Worker.assertFingerprint` runs it before listen and spawn. `evaluateItemReplacement` and the Lua `evaluate-item-replacement` action own the helmet-style replacement. The passive heuristic, gear normalization, and character context are not on this path.

## 8. External APIs / data sources involved

- provider: the user's local Path of Building (PoE2) 0.23.1 install, copied once;
- endpoint/repository/file: `C:\Users\Nitro5\AppData\Local\poe2-buddy\pob2-runtime`, not the Roaming install;
- official/community: community Path of Building (PoE2);
- auth/scopes: none;
- exact fields used: named calc metrics already in the STEP-018B catalog, passive allocation, and one item slot's raw text;
- cache/rate behavior: one worker, in-process queue, reload per candidate;
- version/commit/timestamp: PoB 0.23.1, tree `0_5`, Buddy tree `0.5.5`, runtime fingerprint `sha256:252e1bc3a87e2f424329ea70adb09c0017c7655f90436cfef6072037193d1fc9`, prepared `2026-09-27T12:48:02.923Z`, source commit null;
- fallback behavior: an unknown mapping, a fingerprint mismatch, or a failed restore does not calculate.

No live GGG, poe.ninja, or pobb.in call was made.

## 9. Credentials / environment variables

### Added/changed variable names

```dotenv
POB2_CALCULATOR_ENABLED=
POB2_CALCULATOR_DIR=
```

No new variables. Both stay empty in `.env.example`. The enabled check still requires the exact string `true`.

### Credential status

NOT REQUIRED

## 10. Data model / schema changes

`CALCULATOR_ADAPTER_VERSION` is 2. `CALCULATOR_PROTOCOL_VERSION` is 2. Worker responses must include `protocolVersion: 2`. A passive success carries `requestedNodeIds`, `verifiedNodeIds`, `actuallyAllocatedNodeIds`, `allocationMode`, and `verifiedPointCost`. Provenance includes `protocolVersion` and `runtimeFingerprint`. The runtime manifest adds `runtimeFingerprint` and `protocolVersion` and requires adapter version 2. `evaluateItemReplacement` returns slot, baseline and candidate identities, skill, named metrics, `restoreVerified`, and provenance. Passive, gear, and character-context versions are unchanged.

## 11. Commands executed

```bash
npm run format
npm test
npm run typecheck
npm run lint
npm run format:check
node scripts/prepare-pob2-runtime.mjs
npm run test:pob2-calculator
```

`npm audit` was not run. Dependency files did not change.

## 12. Automated tests

| Command/Test                   | Result | Notes                                                     |
| ------------------------------ | ------ | --------------------------------------------------------- |
| `npm test`                     | PASS   | 40 files, 276 tests. No PoB2 executable.                  |
| `npm run typecheck`            | PASS   | All workspaces, including the web app and the calculator. |
| `npm run lint`                 | PASS   |                                                           |
| `npm run format:check`         | PASS   | After formatting `scripts/prepare-pob2-runtime.mjs`.      |
| `npm run test:pob2-calculator` | PASS   | 5 tests, 67.34s. Fails if the runtime is missing.         |

The opt-in file is `tests/pob2-calculator.integration.test.ts`. The default Vitest config still excludes `**/*.integration.test.ts`.

## 13. Manual verification

Headless Chrome opened `http://localhost:3000` with the calculator enabled and imported fixture B. The heuristic still showed the focused path at score 72. The character-aware section showed:

- PoB2 0.23.1, tree `0_5`, Buddy tree `0.5.5`, runtime `sha256:252e1bc3a87e2f424329ea70adb09c0017c7655f90436cfef6072037193d1fc9`, ready
- Requested nodes `4739, 18845, 1755, 41965`
- Verified nodes `4739, 18845, 1755, 41965`
- Newly allocated `1755, 4739, 18845, 41965`
- Verified point cost 4
- Allocation verified. Restore check passed.
- Total DPS `4.4583` to `6.0188`, `+35.0%`
- Life `254` unchanged

The section does not name a winner or tell the user to buy or replace an item. The live Roaming `Build.lua` and `Launch.lua` do not contain the worker markers. After the check, the dev server was restarted with the calculator off.

## 14. Errors/issues encountered

- symptom/error: every opt-in test waited about 45 seconds and failed with `timeout`, and `calculator-diagnostics.log` did not grow;
- root cause: the worker hook sat at the end of `buildMode:Init`. The copy's settings opened `Builds/~~temp~~.xml`, that file was gone, and `Init` returned before the hook. Launch still set `devMode=true`;
- attempts: a temporary trace in the copy confirmed `Init` started on the missing temp build and never reached the old hook. The trace was removed and the original bytes were restored before the next prepare;
- final resolution: the prepare script now starts the worker at the beginning of `Init`, before a saved build is loaded. The second `Init` from the worker sees the entered flag and loads the requested XML;
- regression test added? The opt-in suite is the regression. It passes only when that bootstrap connects.

A separate typecheck failure on a possibly null item checksum was fixed in the tests. No PoB process was killed by image name.

## 15. Security/privacy impact

The worker still listens on `127.0.0.1` and the child environment is still only `POB2_CALC_WORKER`, `POB2_CALC_PORT`, `SystemRoot`, `PATH`, and `WINDIR`. Raw XML and raw item text are not written to the diagnostics log. Item text is bounded at 65536 characters and must contain `Rarity:` before a worker is started. The slot is an enum, not a path. A fingerprint mismatch does not calculate and does not rewrite the manifest. Buddy's worker protocol is localhost-only. Known PoB auto-update is disabled. OS-level outbound access is not currently blocked.

## 16. Performance impact

Recorded in the runtime's `calculator-performance.json` for PoB 0.23.1 / tree `0_5`:

- `fingerprintMs=2726` for one explicit fingerprint walk
- `baselineMs=6614` including cold start and the fingerprint check inside the first worker start
- `candidateMs=309` for node `4739`, including reload and restore
- `weaponSet1=measured`
- `multiNode=exact` for `[4739, 18845]`, verified point cost 2
- `itemReplacementMs=308` for the fixture F helmet
- `tenMs=8267`
- `fiftyMs=47086`

The fingerprint is not repeated for a second request on the same worker. Batch sizes stayed at 10 and 50.

## 17. Data provenance / reproducibility impact

A successful passive or item result names PoB version, tree key, Buddy tree version, adapter version 2, protocol version 2, the build checksum, and `runtimeFingerprint`. The fingerprint is the semantic identity of the calculation files. The executable checksum remains on the manifest and is still checked. The passive heuristic, gear normalization version 3, PoB2 normalization version 3, and character context version 1 are unchanged. The official tree pin is unchanged.

## 18. Known limitations

OS-level outbound access is not blocked. There is no item-delta screen. The calculator does not search or rank items. A four-node path that PoB2 cannot allocate exactly must come back as `candidate-allocation-mismatch`; on this runtime the focused path `[4739, 18845, 1755, 41965]` allocated exactly those ids. The item-editor window comparison from STEP-018A.1 is still not done. FullDPS stays outside the catalog.

## 19. Decisions made

D-082. Exact requested and applied passive sets must match. The runtime fingerprint is the calculation pin. Network wording matches what is enforced. Item replacement is a delta primitive, not a recommendation. Adapter and protocol versions are 2.

## 20. Deviations from planning docs

The worker bootstrap moved from the end of `buildMode:Init` to the start. The end hook never ran when the copy's last build file was missing. The early hook is still one-time, still only on the isolated copy, and the live install is not patched. No other acceptance criterion was narrowed.

## 21. Remaining risks

A PoB2 update on the live install does not change the copy until prepare is run again. A changed calculation file without a new prepare fails closed. The worker process can still open an outbound connection; the protocol does not use one, and auto-update is disabled, but there is no firewall rule. Item text is parsed by PoB2, not by this repository, so a malformed item that passes the `Rarity:` check can still be rejected by the worker as `item-invalid`.

## 22. Rollback notes

Revert the calculator, web adapter, prepare script, and tests from this step, and run `node scripts/prepare-pob2-runtime.mjs` only if the previous worker and manifest are restored together. An adapter 2 manifest will not load under adapter 1. The live install was not modified.

## 23. Recommended next step

STEP-018C is not started. The next planning step can consume `evaluateItemReplacement` and the verified passive delta. It should not treat either result as a rank.

## 24. Completion statement

STEP-018B.1 satisfies the acceptance criteria above. Status is COMPLETE.

## Why STEP-018B Needed Closure

STEP-018B could return a delta after PoB2 allocated nodes the candidate did not request, and it pinned the executable and the worker file rather than the Lua and tree data that produced the numbers. The network sentence also needed to match the control that exists. Item changes had no production delta primitive.

## Passive Candidate Identity

A success records `requestedNodeIds`, `verifiedNodeIds`, and `actuallyAllocatedNodeIds`. Verified ids are the requested ids after the server accepts the candidate. Actually allocated ids are the nodes that were not allocated at the baseline and are allocated after `AllocNode`. The UI shows all three.

## Baseline Allocation Snapshot

Before allocation, the worker copies the allocated node ids. Newly allocated ids are the after-set minus that snapshot. The original XML is loaded again for every candidate.

## Exact Allocation Verification

The Lua worker and `outcomeFromResponse` both require set equality. Order does not matter. The focused UI path requested `[4739, 18845, 1755, 41965]` and PoB2 newly allocated that same set.

## Auto-Path Mismatch Policy

If the new set is not the requested set, the worker restores the undo state. A matching restore returns `candidate-allocation-mismatch` with requested, expected, actual, unexpected, and missing ids. A differing restore returns `restore-failed` and discards the worker. A partial `AllocNode` is the same mismatch, not a partial success. A requested id that is already allocated is a mismatch and does not call `AllocNode`. An unknown id stays `passive-node-unknown`. The user-facing sentence is "The allocated nodes are not the requested candidate." The mock case requested `[4739]` and received `[4739, 18845]` and expected `candidate-allocation-mismatch`.

## Server Point-Cost Verification

The browser sends the node ids, the claimed cost, the objective, and the point budget from the submitted analysis. `measurePassiveDelta` calls `runPassiveAnalysis` again and `selectVerifiedPassiveCandidate`. A set that is not in that recommendation, or a claimed cost that is not that candidate's `pointCost`, is `candidate-invalid` and does not start a calculation. The calculator does not import `passive-engine`.

## Runtime Fingerprint Design

Each included file is SHA-256 of its raw bytes. Relative paths use `/` and are sorted by UTF-16 code unit. The aggregate is SHA-256 of `path\0hex\n` lines. The form is `sha256:` plus the hex digest. `Launch.lua` is included, so the developer-mode patch is part of the identity. The manifest is written after the copy, the worker file, and the patches. The app does not regenerate the manifest.

## Fingerprint Include/Exclude Rules

Included: `Path of Building-PoE2.exe`, top-level `*.dll`, `manifest.xml`, `Launch.lua`, `GameVersions.lua`, and `Modules/`, `Classes/`, `Data/`, `TreeData/`, and `lua/`.

Excluded: `Assets`, `Builds`, `Update`, `SimpleGraphic`, updater executables (`Update.exe`, `Uninstall.exe`, `UpdateApply.lua`, `UpdateCheck.lua`, `LaunchServer.lua`), `Settings.xml`, `imgui.ini`, `*.log`, `poe2-buddy-runtime.json`, `calculator-diagnostics.log`, `calculator-performance.json`, and changelog, help, and license files. `UpdateCheck.lua` is excluded because the enforced control is the `Launch.lua` patch, not a network jail.

## Runtime Integrity Gate

`assertFingerprint` runs inside `ensureStarted` when the socket is null, before listen and spawn. The result is cached on the worker and cleared on discard, so the next start hashes again. A second request on the same socket does not hash again. A mismatch throws `runtime-integrity-mismatch`. Unit tests supply a fingerprint hook so they do not walk an empty temp directory. An old manifest without the new fields fails Zod parsing.

## Network Policy Correction

Buddy's worker protocol is localhost-only. Known PoB auto-update is disabled. OS-level outbound access is not currently blocked. This step does not add a firewall rule and does not claim the process can only access localhost.

## Item Replacement API

`evaluateItemReplacement(build, candidate)` takes `slot`, `rawItemText`, and an optional `label`. It does not search, synthesize, price, or recommend. The calculator does not import `gear-engine`.

## Item Slot Mapping

`helmet` to `Helmet`, `body-armour` to `Body Armour`, `gloves` to `Gloves`, `boots` to `Boots`, `amulet` to `Amulet`, `ring-1` to `Ring 1`, `ring-2` to `Ring 2`, `belt` to `Belt`, `main-hand` to `Weapon 1`, `off-hand` to `Weapon 2`. Any other slot is `item-slot-unsupported`. Empty text, text longer than 65536 characters, or text without `Rarity:` is `item-invalid` and does not start the worker.

## Item Mutation Flow

Load the original XML, record the baseline metrics, the selected item id, and the original raw checksum. `new("Item", raw)`, `AddItem(item, true)`, `SetSelItemId`, `BuildOutput`. Then `SetSelItemId` of the previous id, `DeleteItem`, and `BuildOutput` again. Parser rejection is `item-invalid`. A slot that cannot be equipped is `item-replacement-failed` or `item-slot-unsupported`.

## Item Restore Verification

Restore succeeds only when the metrics equal the baseline and the selected item id equals the baseline id. Otherwise the result is `restore-failed` and the worker is discarded.

## Item Delta Metrics

The item result uses the same catalog and the same percent policy as a passive delta. Percent stays null when the baseline is zero. There is no item score, upgrade score, price, or recommendation field.

## Real PoB2 Item Regression

Fixture F, slot `helmet`, raw rare Wrapped Greathelm from the STEP-018A spike (`Spike Helm`, `Armour: 40`, `+80 to maximum Life`). On PoB 0.23.1 / tree `0_5` / fingerprint `sha256:252e1bc3a87e2f424329ea70adb09c0017c7655f90436cfef6072037193d1fc9`:

- Life `382` to `464` (`+82`)
- Armour `194` to `144` (`-50`)
- Total EHP `331.5453384` to `396.638227`
- Mana `174` to `172`
- build checksum `sha256:51abf7210786573d80631420045bbab3f93d137ac3036b81bef7c16e89a9d5f3`
- candidate raw checksum `sha256:375a80de98d5fc952e17de432acc3f8e5bb5d4ac94a5348f2d375e37f7decbc8`
- restore verified

## Calculator Adapter Version

`CALCULATOR_ADAPTER_VERSION` moved from 1 to 2. The manifest literal is 2. A version 1 manifest fails closed.

## Protocol Version

`CALCULATOR_PROTOCOL_VERSION` is 2. The host sends it on every request. The worker rejects a different version. Every response includes `protocolVersion = 2`. A missing or different version is `protocol-invalid`.

## Security / Privacy

See section 15. The mandatory network sentence is in section Network Policy Correction.

## Passive UI Regression

The enabled analysis of fixture B still shows score 72 and the character-aware section described in section 13. The heuristic is not reordered. Loading copy remains "Measuring candidate…". Disabled copy remains "Character-aware calculation unavailable." There is no item UI.

## Performance Impact

See section 16. Fingerprint verification is once per worker start. One item replacement was about 308 ms after the worker was already warm.

## Remaining Runtime Risks

See section 21. The copy can still be stale relative to a newer live install until prepare is run. Outbound access is not blocked at the OS.

## STEP-018C Readiness

The passive delta now identifies the measured candidate, and one explicit item replacement can be measured and restored. Neither result is a rank, a price, or a recommendation. STEP-018C is not started.
