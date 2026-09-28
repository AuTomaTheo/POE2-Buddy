# STEP-018B — Character-aware delta evaluator

**Date:** 2026-09-27  
**Status:** COMPLETE  
**Roadmap reference:** Phase 5 / STEP-018B  
**Authoring context:** Cursor-assisted development

## 1. Objective

Measure how one controlled passive candidate changes a real imported PoB2 build, and show those named metric deltas beside the existing heuristic. A delta is not a score and it does not reorder paths.

## 2. Acceptance criteria

- [x] The production adapter sits behind `evaluatePassiveCandidate` / `calculateBaseline`
- [x] The calculator runs in a separate PoB2 process, outside Next.js
- [x] The user's live PoB2 install is not edited
- [x] The runtime is a pinned isolated copy
- [x] Auto-update is disabled on that copy when it is started as a worker
- [x] Network use is localhost only, and that limit is documented
- [x] One build is calculated at a time
- [x] The worker recycles after 20 loads or 30 minutes, and after timeout, crash, or a failed restore
- [x] Version compatibility is checked before calculation
- [x] Unknown or mismatched mappings fail closed
- [x] A baseline is calculated before the candidate
- [x] The candidate is applied as a passive allocation and then restored
- [x] Named metrics have before, after, and absolute delta
- [x] Percent is emitted only when the metric allows it and the baseline is positive
- [x] There is no composite score
- [x] Character context is not rewritten
- [x] The passive heuristic, gear normalization, and PoB2 import are unchanged
- [x] The analysis screen can show one candidate delta
- [x] Errors are structured, and timeouts discard the worker
- [x] `npm test` does not require a PoB2 executable
- [x] `npm run test:pob2-calculator` is the opt-in real-worker command
- [x] Repository checks pass
- [x] This completion note exists

## 3. Implementation summary

`@poe2-helper/pob2-calculator` turns a PoB2 XML document and one passive candidate into named deltas. The web app decodes the export the user already submitted, checks the approved version triple, and asks one long-lived worker. The worker is a copy of PoB2 0.23.1 under `%LOCALAPPDATA%\poe2-buddy\pob2-runtime`. Node listens on `127.0.0.1` and the copy connects with luasocket. Deltas are computed in TypeScript. The heuristic result renders first. The delta section is a second request. D-081 records the policy.

## 4. Files created

| File                                                         | Purpose                                            |
| ------------------------------------------------------------ | -------------------------------------------------- |
| `packages/pob2-calculator/package.json`                      | Workspace package. Depends only on Zod             |
| `packages/pob2-calculator/tsconfig.json`                     | Strict typecheck. Excludes the real-worker test    |
| `packages/pob2-calculator/src/errors.ts`                     | Structured error codes and user-facing sentences   |
| `packages/pob2-calculator/src/compatibility.ts`              | The single approved version triple                 |
| `packages/pob2-calculator/src/metrics.ts`                    | Metric catalog and percent policy                  |
| `packages/pob2-calculator/src/delta.ts`                      | Before/after math and display text                 |
| `packages/pob2-calculator/src/protocol.ts`                   | Zod schema for one worker response line            |
| `packages/pob2-calculator/src/evaluate.ts`                   | Baseline and candidate evaluation                  |
| `packages/pob2-calculator/src/worker.ts`                     | Process, queue, recycle, and runtime manifest      |
| `packages/pob2-calculator/src/index.ts`                      | Public exports                                     |
| `packages/pob2-calculator/src/calculator.test.ts`            | Fake-worker unit tests                             |
| `packages/pob2-calculator/src/worker.test.ts`                | Socket, timeout, crash, and recycle tests          |
| `packages/pob2-calculator/runtime/Pob2BuddyWorker.lua`       | Worker script copied into the isolated runtime     |
| `scripts/prepare-pob2-runtime.mjs`                           | One-time copy, bootstrap, and manifest             |
| `apps/web/src/server/measure-passive-delta.ts`               | Web adapter. Does not run inside the client bundle |
| `apps/web/src/app/character-delta.tsx`                       | Delta section                                      |
| `tests/pob2-calculator.integration.test.ts`                  | Opt-in real PoB2 tests                             |
| `vitest.pob2.config.mts`                                     | Separate Vitest config, one worker, long timeout   |
| `docs/progress/STEP-018B-character-aware-delta-evaluator.md` | This completion note                               |

## 5. Files changed

| File                                   | Change                                                        |
| -------------------------------------- | ------------------------------------------------------------- |
| `apps/web/src/app/actions.ts`          | Adds `measurePassiveDelta` as a separate server action        |
| `apps/web/src/app/analysis-screen.tsx` | Shows the delta section for a submitted PoB2 code             |
| `apps/web/package.json`                | Depends on `@poe2-helper/pob2-calculator`                     |
| `apps/web/next.config.ts`              | Transpiles the new package                                    |
| `package.json`                         | Typecheck includes the workspace. Adds `test:pob2-calculator` |
| `package-lock.json`                    | Links the new workspace                                       |
| `tsconfig.json`                        | Typechecks `vitest.pob2.config.mts`                           |
| `vitest.config.mts`                    | Excludes `*.integration.test.ts` from `npm test`              |
| `eslint.config.mjs`                    | Lints the new Vitest config                                   |
| `.env.example`                         | Empty `POB2_CALCULATOR_ENABLED` and `POB2_CALCULATOR_DIR`     |
| `.gitignore`                           | Ignores `var/pob2-runtime/`                                   |
| `docs/planning/DECISION_LOG.md`        | Added D-081                                                   |

## 6. Files deleted

None.

## 7. Important code paths / responsibilities

`checkCompatibility` accepts only PoB tree `0_5`, Buddy tree `0.5.5`, and PoB `0.23.1`. `evaluatePassiveCandidate` rejects a bad triple or a bad candidate before it calls the worker. The worker reloads the original XML, reads the baseline, allocates the requested nodes, reads the after metrics, restores the undo state, and reads the metrics again. TypeScript accepts the result only when the restored numbers are exactly the baseline numbers. `computeMetricDeltas` keeps catalog order, skips missing metrics, and does not turn an unknown field into zero.

`measurePassiveDelta` is not called from `runPassiveAnalysis`. The client calls it after the heuristic result exists, using the PoB2 code captured at submit. The selected path is the one shown on the map, and the UI always asks for shared allocation.

`scripts/prepare-pob2-runtime.mjs` copies the install with robocopy, refuses the live Roaming path, patches only the copy, and writes `poe2-buddy-runtime.json`. The host refuses to start when the manifest, executable checksum, worker checksum, or bootstrap marker does not match.

## 8. External APIs / data sources involved

No network call to GGG, poe.ninja, or pobb.in. The worker talks to Node on `127.0.0.1` only. Fixture codes B and D are the existing 0.23.1 exports. The Buddy tree pin is unchanged: version `0.5.5`, commit `bd87e6512c92b868542eddfb1ba4ea8b6dc2da36`, checksum `sha256:b52be9c4f17e4114064255ef1b8c58292e9db0e395d95af235a8d3fef0d44642`.

## 9. Credentials / environment variables

`POB2_CALCULATOR_ENABLED` must be exactly `true`. Any other value, including empty, leaves the calculator off. `POB2_CALCULATOR_DIR` is the isolated copy. Both are empty in `.env.example`. The child process receives `POB2_CALC_WORKER`, `POB2_CALC_PORT`, `SystemRoot`, `PATH`, and `WINDIR`. It does not inherit `GGG_CLIENT_SECRET` or other parent secrets. No credentials were invented.

## 10. Data model / schema changes

No change to character context, gear normalization, or PoB2 normalization. `CALCULATOR_ADAPTER_VERSION` is 1. A successful result carries metric rows, skill identity, allocation mode, restore verification, warnings, weapon-set nodes already on the build, and provenance. Readiness is `ready` or `partial` on success, and the error codes cover incompatible, unavailable, and failed calculations.

## 11. Commands executed

```text
npm install
npm run format
npm test
npm run typecheck
npm run lint
npm run format:check
npm audit
node scripts/prepare-pob2-runtime.mjs
npm run test:pob2-calculator
```

`npm install` added the workspace link. `npm audit` reported 0 vulnerabilities. `npm test` was 38 files and 263 tests in about 12.7 seconds. Typecheck, lint, and format check passed. The prepare script wrote the copy at `C:\Users\Nitro5\AppData\Local\poe2-buddy\pob2-runtime`. The opt-in command passed 3 tests. The recorded run took 55.49 seconds.

## 12. Automated tests

Default tests cover the approved triple, percent and zero and negative baselines, delta math, structured errors, response validation, readiness, a fake baseline, a fake candidate, restore mismatch, timeout, crash, invalid JSON, version mismatch, and an unknown metric. Worker tests cover a localhost JSON line, a dropped socket, one-build-at-a-time queueing, the 20-load recycle, and the 30-minute rule.

The opt-in test loads fixture B, checks Life 254, Average Hit about 5.35, and Total DPS about 4.458333333. Allocating node 4739 as shared moves Average Hit to about 5.885 and Total DPS to about 4.904166667, both about +10%, and the restore matches. Fire resistance stays -50 with no percent. Energy Shield stays 0 with no percent. The same test allocates node 4739 in weapon-set 1, and that mutation restored. Fixture D's baseline includes node 1755 with allocation mode 1.

## 13. Manual verification

Headless Chrome opened `http://localhost:3000` and imported fixture B. With the calculator off, the page still showed the heuristic, including the first fully valued path at score 72, and the delta section said "Character-aware calculation unavailable."

With the calculator pointed at the isolated copy, the same import showed the delta for the selected path `4739, 18845, 1755, 41965`. Provenance was PoB2 0.23.1, tree `0_5`, Buddy tree 0.5.5, status ready. Main skill was Fireball. Restore check passed. Total DPS moved from 4.4583 to 6.0188 (+35.0%) because that path allocates four nodes, not only 4739. Score 72 was still listed under fully valued paths. The live `Modules/Build.lua` has no worker marker.

The dev server on port 3000 was restarted afterward without the calculator flag.

## 14. Errors/issues encountered

The package's child environment type required `NODE_ENV` under the web app's Node types. The worker environment is now an explicit short record, not a full inherited `ProcessEnv`.

The React hook lint rejects a synchronous `setState` at the start of an effect. The delta section remounts when the selected path changes, so the loading state is the initial state.

The first opt-in run took 97 seconds and did not keep console timings. The second run wrote `calculator-performance.json` inside the runtime directory, which is outside the repo.

## 15. Security/privacy impact

The worker is a separate copy. The host refuses the live Roaming install. The child environment does not include GGG or AI secrets. Logs record the request outcome, versions, checksums, and duration. They do not record the XML. User-facing errors do not include Lua stacks. The diagnostics log in the runtime directory recorded socket-closed lines only during these runs. The runtime copy is not committed.

## 16. Performance impact

From the opt-in run, on this machine, PoB 0.23.1:

| Step                                    | Time     |
| --------------------------------------- | -------- |
| Cold start plus first baseline          | 6585 ms  |
| One shared candidate, including restore | 301 ms   |
| Ten candidates                          | 2861 ms  |
| Fifty candidates                        | 44009 ms |

The fifty-candidate time includes recycles. Every candidate reloads the XML. A new process per candidate was not used. Heuristic analysis does not wait for the worker.

## 17. Data provenance / reproducibility impact

Every success records PoB version, PoB tree key, Buddy tree version, Buddy commit and checksum when the snapshot has them, adapter version 1, the build checksum, and the runtime executable checksum. The approved triple is exact. `0_5` is not compared to `0.5.5` as strings. The prepare manifest records PoB 0.23.1, branch `master`, platform `win32`, tree key `0_5`, and a null source commit because this install has no local git repository.

## 18. Known limitations

The UI measures the selected main-tree path as shared only. Weapon-set 1 allocation of node 4739 worked in the opt-in test and is not offered as a button. Item, support, and config changes are not in the public API. The manual tree click from STEP-018A.1 still missed, and the item editor was still not compared. Those gaps are outside this API. Node-id equality remains established only for the classes sampled earlier. A zero absolute change on a percent-enabled metric can still show `0.0%`.

## 19. Decisions made

D-081. The calculator worker boundary, the runtime pin, the ban on live-install edits, fail-closed compatibility, one build at a time, the recycle rule, the percent policy, and the absence of a composite score are one policy.

## 20. Deviations from planning docs

The worker protocol is one JSON line per message over a localhost TCP socket. The PoB2 executable is a Windows GUI program, so parent stdin and stdout are not a reliable channel. The copy already contains luasocket and dkjson.

Each candidate reloads the original XML instead of mutating one warm build for the whole batch. A failed restore cannot leak into the next candidate. Restore is still checked on every success, and a mismatch discards the process.

Full denial of outbound network from the PoB2 process is not practical. Auto-update is skipped because the copy sets `devMode` when `POB2_CALC_WORKER=1`.

## 21. Remaining risks

The Lua heap still grows across reloads, which is why the process recycles. A future PoB or tree version will fail closed until a new triple is added on purpose. Shipping the PoB2 runtime files would still be a licensing question; this step does not copy them into the repository. The fifty-candidate path is slower than an in-memory batch because every candidate reloads the build.

## 22. Rollback notes

Remove the web dependency and the delta section, and stop setting the two environment variables. The isolated copy can be deleted from `%LOCALAPPDATA%\poe2-buddy\pob2-runtime`. The live install was not modified. Passive scores, gear normalization version 3, PoB2 normalization version 3, and character context version 1 stay as they were.

## 23. Recommended next step

Stop. Do not start STEP-018C, passive reranking, item ranking, crafting, trade, or AI explanations until that work is explicitly approved.

## 24. Completion statement

STEP-018B is complete. Buddy can measure one legal passive candidate against an imported PoB2 build with a pinned isolated worker and return named deltas. The existing ranking behavior is unchanged.

## Why STEP-018B Exists

The heuristic can order passive paths without knowing how those paths change this character's calculated damage or life. STEP-018B measures that change for one candidate. It does not decide which path is best.

## Production Calculator Boundary

The calculator package depends only on Zod. It does not import data-sources, the passive engine, or React. The web server decodes the export and owns the process. Next.js does not embed the PoB2 runtime. The research hook from STEP-018A is not the production path.

## Worker Runtime Pin

`poe2-buddy-runtime.json` records PoB 0.23.1, branch, platform, tree key `0_5`, the executable checksum, the worker-script checksum, the copy path, adapter version 1, and the preparation time. The host reads the executable and the worker file again before the first request and refuses a mismatch.

## Worker Isolation

The copy lives under LocalAppData, not under the Roaming live install and not in the git repository. The prepare script exits if the destination is the live install, and it hashes the live `Build.lua` and `Launch.lua` before and after the copy. The bootstrap marker is `POB2_CALC_WORKER_BEGIN` in the copy only.

## Auto-Update Policy

This install's manifest has branch `master` and platform `win32`, so a plain copy would check for updates. The copy's `Launch.lua` sets `devMode` when `POB2_CALC_WORKER=1`, after the manifest is read. Developer mode skips `CheckForUpdate` and keeps the user path inside the copy.

## Network Policy

Node binds `127.0.0.1` on an ephemeral port and passes that port only to the child. Localhost is not a live game or trade request. The process is not placed in a firewall jail. Auto-update is the control that stops PoB2 from contacting an update server during calculation.

## Compatibility Gate

The gate is one object in `APPROVED_CALCULATOR_MAPPINGS`. The worker also checks `spec.treeVersion` and `launch.versionNumber` against that same pair. A miss returns `version-incompatible` and does not evaluate.

## Build Load Flow

The web adapter decodes the submitted code, imports it with the pinned tree so the PoB tree key comes from the document, and sends the inflated XML. The Lua worker calls `Shutdown` and `Init` on that XML. `abortSave` is set before shutdown so the copy does not write a temp build.

## Baseline Calculation

`calculateBaseline` loads the build and returns numeric catalog metrics, skill identity, and weapon-set nodes whose allocation mode is greater than zero. The candidate action records the same baseline before it allocates anything.

## Selected Skill Metadata

The skill name, effect id, and source gem come from the display group's granted effect. Skill types and base flags come from the calculated main skill when those tables exist. A missing name makes readiness `partial` and adds the warning `selected skill unresolved`. Fixture B resolved to Fireball / `FireballPlayer`.

## Metric Inventory

The catalog is Average Damage, Average Hit, Total DPS, Combined DPS, Crit Chance, Crit Multiplier, Speed, Cast Rate, Hit Chance, Life, Energy Shield, Armour, Evasion, Deflection Rating, Deflect Chance, Total EHP, Mana, Spirit, and the four resistances. Total DPS, Combined DPS, and any other damage field stay separate. `FullDPS` is not in the catalog. An unknown numeric field becomes the warning `unsupported metric` and is not coerced to zero.

## Metric Normalization

Rows stay in catalog order. A missing before or after value omits that metric. Values are the numbers PoB2 calculated. Display text rounds to four decimal places. Percentage points are labeled as such.

## Passive Candidate Model

A candidate is a list of positive integer node ids, an allocation mode, and an optional point cost. The list cannot be empty, longer than 50, or contain duplicates. The UI sends one candidate. A batch helper exists and stops early after a restore failure, timeout, or crash. Results are not sorted.

## Weapon-Set Allocation Model

Modes are shared `0`, weapon set 1 `1`, weapon set 2 `2`, and weapon set 3 `3`. An unknown mode is invalid. It is not treated as shared. The UI sends shared only. Fixture D's baseline reports node 1755 at mode 1. A weapon-set 1 allocation of node 4739 on fixture B succeeded and restored. That success is not turned into a second UI control.

## Mutation Flow

The worker checks that every id exists. If every requested node is already allocated, it returns `candidate-invalid` and does not allocate. Otherwise it saves an undo state, sets `allocMode`, allocates each missing node, and records the node ids that became allocated, including path nodes. If an allocation does not stick, it restores and returns `candidate-invalid`.

## Restore Verification

After the after-metrics are read, the worker restores the undo state, sets `allocMode` back to 0, and recalculates. TypeScript requires the restored map to be exactly the baseline map. A mismatch returns `restore-failed` and discards the process.

## Delta Math

Absolute delta is after minus before. Percent is absolute delta divided by the absolute value of the baseline, times 100, only when the policy allows it. There is no weight and no sum across metrics.

## Percentage Policy

Percent is allowed for Average Damage, Average Hit, Total DPS, Combined DPS, Life, Energy Shield, Armour, Evasion, Total EHP, Cast Rate, and Speed, and only when the baseline is greater than zero. A zero or negative baseline yields `percentDelta: null`, never infinity. Crit chance, hit chance, deflect chance, resistances, Spirit, Mana, deflection rating, and crit multiplier are absolute. A resistance change is described in percentage points.

## Readiness Model

Calculator readiness is separate from gear, context, and passive readiness. Success is `ready`, or `partial` when the skill name is missing. Failure codes distinguish incompatible, unavailable, and the calculation errors. The screen does not replace the heuristic with an error page.

## Error Model

Codes are `runtime-unavailable`, `version-incompatible`, `build-load-failed`, `skill-unresolved`, `candidate-invalid`, `passive-node-unknown`, `calculation-failed`, `restore-failed`, `timeout`, `worker-crashed`, and `protocol-invalid`. The disabled message is "Character-aware calculation unavailable." Other failures add a short category and do not include a Lua stack.

## Timeout / Crash Recovery

Startup waits up to 45 seconds for the socket. A calculation waits 30 seconds unless a caller sets another timeout. Timeout and a dropped socket discard the process. The next request starts a new one. Only that child pid is killed, with `taskkill /PID /T /F`. The image name is not used.

## Worker Recycle Policy

One in-process queue serves one worker. A non-health request increments the load count. At 20 loads, or when the process is older than 30 minutes, the next build request discards it and starts another. Timeout, crash, invalid JSON, and a failed restore also discard it.

## Protocol

The child connects to `127.0.0.1` and the port in `POB2_CALC_PORT`. Each message is one JSON line. Actions are `health`, `baseline`, and `evaluate-passive-candidate`. The response is parsed with a strict Zod schema. A wrong request id or an extra field is `protocol-invalid`.

## Feature Flag

`POB2_CALCULATOR_ENABLED=true` and a prepared `POB2_CALCULATOR_DIR` turn the section from the unavailable sentence into a calculation. The example file keeps both values empty. The app runs without PoB2.

## UI Integration

The section title is "Character-aware delta". It appears after a successful PoB2 analysis, using the code from that submit. It shows provenance, the skill name, the candidate nodes, the point cost, warnings, and a table of before, after, change, and percent. Loading text is "Measuring candidate…" and it is only in that section. There is no winner label and no green or red overall score. Metric plus and minus text is specific to each row. The first fixture B path still shows heuristic score 72.

## Testing Strategy

Unit tests and fake-socket tests run under `npm test`. The real PoB2 file is named `*.integration.test.ts` and is excluded from that config. `npm run test:pob2-calculator` uses `vitest.pob2.config.mts`, one worker, and a long timeout. A missing runtime fails that command. It does not skip.

## Real PoB2 Integration Command

```text
node scripts/prepare-pob2-runtime.mjs
npm run test:pob2-calculator
```

The second command passed: 1 file, 3 tests, 55.49 seconds on the recorded run.

## Performance Results

Cold start plus first baseline was 6585 ms. One shared node-4739 candidate, including reload and restore, was 301 ms. Ten candidates were 2861 ms. Fifty candidates were 44009 ms, including recycles after 20 loads. Weapon-set 1 allocation of node 4739 was measured and restored. The UI's four-node path was a separate measurement: Total DPS 4.4583 to 6.0188.

## Security / Privacy

See section 15. The copy is outside the repository. `var/pob2-runtime/` is gitignored for a copy placed inside the repo. PoB2 assets were not added to the repo.

## Passive Heuristic Regression

`recommendMainTreePaths` is not called with calculator output. `npm test` includes the existing recommendation tests. The fixture B screen still showed score 72 for nodes 4739, 18845, 1755, and 41965. `ANALYSIS_TOP_K` remains 5. Profile version remains 1.

## Gear Regression

Gear normalization version remains 3. The gear section on the fixture B import still reported readiness and missing slots. No gear score was added.

## Character Context Regression

`CHARACTER_CONTEXT_VERSION` remains 1. The fixture B screen still showed primary skill Fireball and context readiness partial. Context is not an input to the delta, and the delta is not written back into context.

## Known Limitations

Repeated in section 18. The additional limits specific to this step are: shared-only UI allocation, no item or support or config API, reload-per-candidate cost, and no outbound-network jail beyond the disabled auto-update.

## STEP-018C Status

STEP-018C, budget-aware upgrade prioritization, is not started. This step does not rank candidates by the deltas, estimate currency, or recommend a craft or a purchase.
