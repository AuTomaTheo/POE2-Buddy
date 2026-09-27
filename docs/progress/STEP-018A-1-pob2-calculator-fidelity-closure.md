# STEP-018A.1 — PoB2 calculator fidelity closure

**Date:** 2026-09-27  
**Status:** COMPLETE  
**Roadmap reference:** Phase 5 / STEP-018A.1  
**Authoring context:** Cursor-assisted development

## 1. Objective

Close the fidelity gaps left by STEP-018A: read one build from the visible PoB2 window, separate support mutation from skill-level mutation, show or downgrade a configuration effect, and check a notable id plus a real weapon-set node id. This step does not build the production calculator.

## 2. Acceptance criteria

- [x] Fixture B was compared with values read from the PoB2 window
- [x] The compared fields, differences, and rounding are recorded
- [ ] Node 4739 was allocated by a mouse click in the tree view
- [ ] The fixture F helmet swap was recreated in the item editor
- [x] Support disable and restore were executed
- [x] A configuration line changed a calculated metric and then restored
- [x] Notable 17788 and ordinary notable 2254 match the pinned tree
- [x] Fixture D weapon-set node 1755 was read from the loaded spec without setting `allocMode`
- [x] The node-id wording is limited to the sampled classes
- [x] The capability matrix no longer treats support mutation as proven by the skill-level test
- [x] The live-install hook is documented as research-only
- [x] Production ranking, gear, character context, and PoB2 import were not changed
- [x] This completion note exists

The unchecked items are recorded below as not completed. They are not described as successes.

## 3. Implementation summary

The closure stays in `spikes/pob2-calculator/`. One probe loads fixtures D, C, and B inside PoB2 0.23.1 and writes `results/closure-report.json`. A second session leaves the PoB2 window open, saves screenshots, and tries to click node 4739. The temporary `Build.lua` hook is restored after each run. D-080 records that this hook is not a production request path. STEP-018B was not started.

## 4. Files created

| File                                                            | Purpose                                                   |
| --------------------------------------------------------------- | --------------------------------------------------------- |
| `spikes/pob2-calculator/pob-launch.mjs`                         | Shared launch, hook, and restore for the closure commands |
| `spikes/pob2-calculator/closure-probe.lua`                      | Node-id, support, and configuration probe                 |
| `spikes/pob2-calculator/run-closure.mjs`                        | Runs that probe and writes the report                     |
| `spikes/pob2-calculator/ui-session.lua`                         | Loads fixture B and leaves the window open                |
| `spikes/pob2-calculator/run-ui-session.mjs`                     | Captures the window and attempts the tree click           |
| `spikes/pob2-calculator/window-tools.ps1`                       | Window capture and mouse click                            |
| `spikes/pob2-calculator/results/closure-report.json`            | Probe output                                              |
| `spikes/pob2-calculator/results/ui/`                            | Window screenshots and session notes                      |
| `docs/progress/STEP-018A-1-pob2-calculator-fidelity-closure.md` | This note                                                 |

## 5. Files changed

| File                                                                   | Change                         |
| ---------------------------------------------------------------------- | ------------------------------ |
| `spikes/pob2-calculator/README.md`                                     | Documents the two new commands |
| `docs/planning/DECISION_LOG.md`                                        | Adds D-080                     |
| `docs/progress/STEP-018A-pob2-calculation-engine-integration-spike.md` | Points to this correction      |

## 6. Files deleted

None. Debug crops were removed. The `Build.lua` hook was removed after each run.

## 7. Important code paths / responsibilities

`run-closure.mjs` and `run-ui-session.mjs` start the installed PoB2 executable. The hook at the end of `buildMode:Init` loads a Lua file and, unless `POB2_SPIKE_HOLD` is `1`, calls `Exit()`. The UI session does not exit, so the normal window remains. `closure-probe.lua` only reads nodes, disables one support gem, and applies one custom modifier through `ConfigTab:BuildModList`. None of these files are imported by the web app.

## 8. External APIs / data sources involved

The local PoB2 0.23.1 install and the stored fixtures B, C, and D. The Buddy side of the node comparison is the pinned snapshot `docs/data-snapshots/passive-tree/data.json` and `D.truth.json`. No network call was added. The PoB2 window itself showed an "Update Ready" notice during the UI session. That update was not applied.

## 9. Credentials / environment variables

`POB2_DIR` still overrides the install path. The closure scripts also set `POB2_SPIKE_SCRIPT`, `POB2_SPIKE_OUT`, `POB2_SPIKE_DIR`, and, for the window session, `POB2_SPIKE_HOLD` and `POB2_SPIKE_CASE`. No GGG or AI credentials are used.

## 10. Data model / schema changes

None. `POB2_NORMALIZATION_VERSION` stays 3. `GEAR_NORMALIZATION_VERSION` stays 3. `CHARACTER_CONTEXT_VERSION` stays 1. The passive profile stays version 1.

## 11. Commands executed

Spike commands, not part of `npm test`:

```text
node spikes/pob2-calculator/run-closure.mjs
node spikes/pob2-calculator/run-ui-session.mjs
```

The closure probe was run twice. The second run calls `ConfigTab:BuildModList` before reading the configuration effect. The UI session was run twice. The second click still missed the node. Repository checks are in Regression Results.

## 12. Automated tests

`npm test` does not launch PoB2. The suite result is in Regression Results.

## 13. Manual verification

The fixture B sidebar was read from PNG screenshots of the PoB2 window, not from the Lua report. Details are in Baseline UI Cross-Validation and Passive UI Cross-Validation. The web UI was not changed, so it was not opened for this step.

## 14. Errors/issues encountered

The first UI session failed because the script tried to replace `buildMode.OnFrame`. `buildMode` is local to `Build.lua`, so the script now replaces `build.OnFrame` on the live build object.

A mouse click at the calculated tree position did not allocate node 4739. The client area was 1280 by 720 while PoB2 reported a 1536 by 792 surface. Scaling the click into the client area still did not allocate the node. The session then called `AllocNode` and later `DeallocNode` so the window could be captured before and after. That is not a completed manual click.

The user's existing PoB2 process 7356 was running before both UI sessions and was not a kill target. The scripts only stop the process they spawn.

## 15. Security/privacy impact

The hook still edits the user's install for the duration of a research run and then restores `Build.lua` and `Settings.xml`. D-080 forbids that pattern as a production request path. No credentials were added.

## 16. Performance impact

No production path changed. The closure probe's cold start was about 15 seconds. Configuration rebuild plus recalc was about 23 milliseconds. Lua heap growth across reloads remains the STEP-018A finding and is not remeasured here.

## 17. Data provenance / reproducibility impact

Fixtures B, C, and D are the existing 0.23.1 exports. No new personal export was created. Screenshots are under `spikes/pob2-calculator/results/ui/`. The probe report is `results/closure-report.json`.

## 18. Known limitations

The tree click missed. The item editor comparison was not done. Energy Shield and Fire Resistance were not in the visible part of the sidebar. Support disable changed the intelligence requirement, not Hit DPS. Linux was not tested. Licensing is unchanged from STEP-018A.

## 19. Decisions made

D-080. The research hook must not become the production way to request a calculation. The worker copy stays separate from the user's install.

## 20. Deviations from planning docs

The passive mutation was visible in the window, but the allocation was `AllocNode` after the click missed. The item swap was not repeated in the item editor. Both are recorded as incomplete rather than forced.

## 21. Remaining risks

A future worker that patches the live install can change the user's program. Auto-update was visibly ready during the session. The Lua heap still grows across reloads. A missed click must not be described later as a proven UI allocation method.

## 22. Rollback notes

Delete the new files under `spikes/pob2-calculator/` except the original STEP-018A runner, remove D-080, and remove this progress note. Confirm `Modules/Build.lua` has no `POB2_SPIKE_HOOK` marker. Production packages do not need a rollback.

## 23. Recommended next step

Review this note. Do not start STEP-018B until that review. If 018B is approved, it uses an isolated pinned worker and the engine methods already exercised. It does not click the tree UI and it does not edit the user's install per request.

## 24. Completion statement

STEP-018A.1 is complete as a closure record. The final label is STEP-018A STILL CONDITIONAL. The minimum STEP-018B evaluator gate is met and is listed under STEP-018B Readiness. This step does not start STEP-018B.

## Reason for Closure Step

STEP-018A had treated the UI as validated because the probe called the same calculation functions the UI uses. It had also grouped skill-level changes with support changes, and it had not read a notable or a weapon-set node from a loaded spec. This step closes those claims without replacing the spike.

## Baseline UI Cross-Validation

Fixture B, build title `UI B (Infernalist)`, PoB2 0.23.1. The main skill dropdown showed Fireball. Values below were read from `results/ui/baseline-sidebar.png`.

| Field           | Spike value  | Value shown in the window  | Difference   | Rounding                                                  |
| --------------- | ------------ | -------------------------- | ------------ | --------------------------------------------------------- |
| Main skill      | Fireball     | Fireball                   | none         |                                                           |
| Life            | 254          | Total Life 254             | 0            | Integer format                                            |
| Energy Shield   | 0            | Not shown                  | Not compared | The sidebar hides a zero Energy Shield                    |
| Average Hit     | 5.35         | 5.3                        | 0.05         | Sidebar format `.1f`                                      |
| Total DPS       | 4.458333333  | Hit DPS 4.5                | about 0.042  | The window labels `TotalDPS` as Hit DPS and formats `.1f` |
| Crit Chance     | 7            | 7.00%                      | 0            | Format `.2f%%`                                            |
| Cast Rate       | 0.8333333333 | 0.83                       | about 0.0033 | Format `.2f`                                              |
| Fire Resistance | -50          | Not in the visible sidebar | Not compared | The row is below the visible scroll                       |

The passive point counter in the window showed `0 / 123` on this baseline.

## Passive UI Cross-Validation

Node 4739, Spell Damage. Two mouse clicks were attempted at the calculated center of the tree view. Neither allocated the node. The client was 1280 by 720 and the PoB2 surface was 1536 by 792. After the click timed out, the session called `PassiveSpec:AllocNode` and refreshed the sidebar, then later called `DeallocNode`.

The window screenshots still show the before, after, and restored numbers:

| State            | Window Average Hit | Window Hit DPS | Window point counter | Spike Average Hit | Spike Total DPS |
| ---------------- | ------------------ | -------------- | -------------------- | ----------------- | --------------- |
| Baseline         | 5.3                | 4.5            | 0 / 123              | 5.35              | 4.458333333     |
| After allocation | 5.9                | 4.9            | 1 / 123              | 5.885             | 4.904166667     |
| Restored         | 5.3                | 4.5            | 0 / 123              | 5.35              | 4.458333333     |

The displayed delta matches the STEP-018A spike, including the return to baseline. The allocation method was not a tree click. That manual procedure is not completed.

## Item UI Cross-Validation

Not completed.

The fixture F helmet swap was not recreated in the PoB2 item editor. That editor is drawn by PoB2 itself, and a bad paste would sit in the live install until settings were restored. No Life, Armour, or Effective Hit Pool comparison from a manual helmet edit is claimed. The STEP-018A engine result for that swap remains an engine result only.

## Skill Mutation Status

Proven in STEP-018A, and unchanged here. Raising the Fireball gem from level 1 to 2 changed metrics, and restoring the level restored the metrics. That result is not evidence about supports.

## Support Mutation Status

Proven for disable and restore on fixture C.

| Item                           | Result                                                               |
| ------------------------------ | -------------------------------------------------------------------- |
| Support                        | Magnified Area II                                                    |
| Method                         | `gem.enabled = false`, then `ProcessSocketGroup`, then `BuildOutput` |
| Active supports before         | Magnified Area II                                                    |
| Active supports while disabled | none                                                                 |
| Metric that changed            | `ReqIntString` 5 to 0                                                |
| Hit DPS and Average Hit        | Unchanged                                                            |
| Restore                        | Supports and metrics returned                                        |

The support left the active skill and the intelligence requirement moved. Area and damage totals did not move for this gem on Shockwave Slam.

## Configuration Loading Status

Proven in STEP-018A. Fixture E loaded `conditionFullLife`, `customMods` of `Added fire damage`, and `detonateDeadCorpseLife` 5000. This step does not repeat that load.

## Configuration Effect Status

Proven for one understood line.

`10% increased Cast Speed` is accepted by `modLib.parseMod`. Setting `customMods` alone did not change any output. Calling `ConfigTab:BuildModList` and then `BuildOutput` did. That is the same rebuild the configuration controls call.

| Metric   | Before       | After        | Change |
| -------- | ------------ | ------------ | ------ |
| CastRate | 0.8333333333 | 0.9166666667 | +10%   |
| Speed    | 0.8333333333 | 0.9166666667 | +10%   |
| TotalDPS | 4.458333333  | 4.904166667  | +10%   |

Restoring the original `customMods`, rebuilding the mod list, and recalculating returned the baseline. `+30 to maximum Life` was not needed after the cast-speed line moved. The STEP-018A full-life toggle did not call `BuildModList`, so it did not show this effect.

## Notable Node-ID Mapping

| Id    | PoB2 name              | PoB2 type | Buddy name             | Buddy notable | Buddy ascendancy |
| ----- | ---------------------- | --------- | ---------------------- | ------------- | ---------------- |
| 17788 | Crystalline Phylactery | Notable   | Crystalline Phylactery | yes           | Witch3           |
| 2254  | Pure Energy            | Notable   | Pure Energy            | yes           | none             |

17788 is the Lich notable in PoB2 and an unallocated node on fixture D. 2254 is an ordinary main-tree notable, also unallocated on that fixture. Both ids are the same integers on both sides. PoB2's ascendancy label for 17788 is Lich. Buddy stores that ascendancy as `Witch3`. That is a name in two catalogs, not a change to the node id.

## Weapon-Set Node-ID Mapping

Fixture D was loaded. The probe did not assign `spec.allocMode`.

| Id    | PoB2 name         | PoB2 type | Allocated | allocMode | Buddy list   |
| ----- | ----------------- | --------- | --------- | --------- | ------------ |
| 1755  | Spell Damage      | Normal    | yes       | 1         | `weaponSet1` |
| 22419 | Attribute         | Normal    | yes       | 2         | `weaponSet2` |
| 6686  | Mana Regeneration | Normal    | yes       | 3         | `weaponSet3` |

Buddy's `D.truth.json` keeps 1755, 22419, and 6686 out of the shared passive list. Shared ids on that fixture are 4739, 18845, 32699, and 54447. Those four were allocated with `allocMode` 0. This is the loaded weapon-set allocation, not a shared node forced into mode 1.

## Updated Node-ID Matrix

No transformation was observed in the sampled node classes.

| Sampled class                  | Id    | Name                   | PoB2 type        | allocMode |
| ------------------------------ | ----- | ---------------------- | ---------------- | --------- |
| Class start                    | 54447 | WITCH                  | ClassStart       | 0         |
| Normal passive                 | 4739  | Spell Damage           | Normal           | 0         |
| Notable                        | 2254  | Pure Energy            | Notable          | 0         |
| Ascendancy notable             | 17788 | Crystalline Phylactery | Notable          | 0         |
| Weapon-set specialization node | 1755  | Spell Damage           | Normal           | 1         |
| Ascendancy start               | 32699 | Infernalist            | AscendClassStart | 0         |

This is not a claim that every id in every tree maps with no transformation.

## Updated Capability Matrix

| Capability                        | Status  |
| --------------------------------- | ------- |
| Build loading                     | proven  |
| Baseline calculation              | proven  |
| Metric extraction                 | proven  |
| Skill/effect metadata             | proven  |
| Passive mutation                  | proven  |
| Weapon-set mutation               | proven  |
| Item mutation                     | proven  |
| Skill-level mutation              | proven  |
| Support mutation                  | proven  |
| Configuration loading             | proven  |
| Configuration effect/application  | proven  |
| Determinism                       | proven  |
| Reset/isolation                   | proven  |
| UI baseline cross-validation      | proven  |
| UI passive-delta cross-validation | proven  |
| UI item-delta cross-validation    | unknown |
| Node-id mapping                   | proven  |
| Server deployment                 | unknown |
| Licensing/redistribution          | unknown |

UI passive-delta is proven for the numbers on the sidebar screenshots. The tree click that was supposed to allocate the node did not, and the window change came from `AllocNode` and `DeallocNode`. UI item-delta is unknown because that comparison was not run. Node-id mapping is proven only for the sampled classes above. Weapon-set mutation here means the loaded fixture D modes were read. It does not mean an automated weapon-set search.

## Production Invocation Constraint

The hook inserted into `Modules/Build.lua` is research-only. STEP-018B must not write that hook, or any other edit, into the user's live PoB2 install for each request. D-080 records that constraint. After these runs, `Build.lua` did not contain `POB2_SPIKE_HOOK`.

## Worker Isolation Requirement

The future runtime is a separate pinned copy of PoB2, not the user's normal install. It is version pinned, auto-update is disabled, one build is loaded per worker, requests are queued, the filesystem and network are sandboxed, and the process is recycled after bounded use. This step does not build that runtime.

## Memory-Recycle Requirement

STEP-018A measured about 33 MB of Lua heap growth on each build reload, climbing from about 179 MB to about 312 MB across five loads. STEP-018B has to recycle the worker because of that growth. This step does not change the allocator or solve the growth.

## Auto-Update Requirement

PoB2 can check for updates at startup. During the UI session the window showed "Update Ready" and text that an update had been downloaded. The future worker must disable auto-update and must not depend on that network check. The downloaded update was not applied.

## Version Compatibility Requirement

PoB2 tree namespace `0_5` is not the GGG pin `0.5.5`. Fixture D in this run reported tree `0_5`. A future calculator uses an explicit mapping from the PoB2 tree key to the Buddy pin and fails closed when the mapping is unknown. The version strings are not compared directly.

PoB2's calculated `mainSkill` remains the trusted future source for skill and effect metadata. It is not wired into CharacterContext.

## Regression Results

Production behavior was not given a new PoB2 dependency. The web app still has no requirement that PoB2 is installed.

`npm run format` completed. `npm test` passed: 36 files, 244 tests, 12.85 seconds. `npm run typecheck`, `npm run lint`, and `npm run format:check` passed. `npm test` does not launch PoB2.

## Remaining Blockers

The tree click did not allocate node 4739. The item-editor comparison was not done. Licensing, Linux, memory recycle, and auto-update remain worker conditions from STEP-018A and D-080.

None of those fail the minimum evaluator list below. The missed click is excluded from STEP-018B scope. STEP-018B still does not start from this note.

## Final STEP-018A Status

STEP-018A STILL CONDITIONAL

The condition is the missed tree click. The sidebar did show the matching before, after, and restored numbers, but those captures followed `AllocNode` and `DeallocNode`. Full validation would require the click itself to allocate and then remove the node. Item UI cross-validation is also not completed. Those two gaps are named here so they are not later treated as done.

## STEP-018B Readiness

The minimum gate is met:

| Gate item                 | Status                                      |
| ------------------------- | ------------------------------------------- |
| Build loading             | proven                                      |
| Baseline calculation      | proven                                      |
| Metric extraction         | proven                                      |
| Passive mutation          | proven                                      |
| Restore/isolation         | proven                                      |
| Version mapping strategy  | explicit map, fail closed                   |
| Worker isolation strategy | separate pinned copy, no live-install edits |

Support mutation and configuration effect are proven and can be in scope later. They are not required for the gate. The item editor and the tree click are out of scope for 018B. 018B must use the isolated worker from D-080, disable auto-update, and recycle the process because of Lua heap growth.

STEP-018B was not started.
