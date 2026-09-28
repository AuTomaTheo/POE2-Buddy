# STEP-018A — PoB2 calculation-engine integration spike

**Date:** 2026-09-27  
**Status:** COMPLETE  
**Roadmap reference:** Phase 5 / STEP-018A  
**Authoring context:** Cursor-assisted development

STEP-018A.1 later corrected the UI, support, configuration-effect, and node-id claims in this note. Those corrections live in `docs/progress/STEP-018A-1-pob2-calculator-fidelity-closure.md`.

## 1. Objective

Find out whether Path of Building for Path of Exile 2 can be the deterministic whole-build calculator for PoE2 Buddy, without turning that calculator into the production recommendation engine.

## 2. Acceptance criteria

- [x] The calculation architecture is documented from the installed source
- [x] The inspected version and commit context are recorded
- [x] Build load, calculation, mutation, and restore were run on stored fixtures
- [x] Skill identity for Fireball and Shockwave Slam was read from the runtime
- [x] Passive, item, skill-level, weapon-set, and configuration changes were tried
- [x] Before/after metric deltas were recorded without a combined score
- [x] Determinism and reload isolation were checked
- [x] Timing, deployment, licensing, and version mapping are documented
- [x] Production scoring, gear analysis, character context, and PoB2 import are unchanged
- [x] `npm test` does not launch PoB2
- [x] This completion note exists

## 3. Implementation summary

The spike lives in `spikes/pob2-calculator/`. It starts the installed PoB2 executable, loads decoded fixture XML through PoB2's own `buildMode:Init`, and reads `CalcsTab:BuildOutput`. A marked hook in `Modules/Build.lua` is inserted only for that process and then restored. D-079 records the architecture conclusion. STEP-018B and STEP-018C were not started.

## 4. Files created

| File                                                                   | Purpose                                               |
| ---------------------------------------------------------------------- | ----------------------------------------------------- |
| `spikes/pob2-calculator/README.md`                                     | How to run the probe, and that tests do not           |
| `spikes/pob2-calculator/run-spike.mjs`                                 | Decodes fixtures, launches PoB2, restores the install |
| `spikes/pob2-calculator/probe.lua`                                     | Runs inside PoB2 and writes the report                |
| `spikes/pob2-calculator/results/spike-report.json`                     | Measured output from the second run                   |
| `docs/progress/STEP-018A-pob2-calculation-engine-integration-spike.md` | This completion note                                  |

## 5. Files changed

| File                            | Change      |
| ------------------------------- | ----------- |
| `docs/planning/DECISION_LOG.md` | Added D-079 |

## 6. Files deleted

None. The temporary `Build.lua` hook was removed before this note was written.

## 7. Important code paths / responsibilities

PoB2's `Launch.lua` loads `Modules/Main.lua`. Main creates one `BUILD` mode from `Modules/Build.lua`. `buildMode:LoadDB` parses `PathOfBuilding2` XML. At the end of `Init`, `CalcsTab:BuildOutput` calls `calcs.buildOutput`. Offence numbers come from `Modules/CalcOffence.lua`. Defence numbers come from `Modules/CalcDefence.lua`. Passive edits go through `PassiveSpec:AllocNode`. Items are `new("Item", raw)` plus `ItemsTab:AddItem`. Configuration is `configTab.input`, and custom modifier text is applied by `modLib.parseMod` in `Modules/ConfigOptions.lua`.

## 8. External APIs / data sources involved

No GGG API and no poe.ninja call. The probe uses the local PoB2 install and the existing fixture codes B, C, E, and F. PoB2's own startup can check for an update when developer mode is off. That check is separate from the calculation.

## 9. Credentials / environment variables

The probe sets `POB2_SPIKE_SCRIPT`, `POB2_SPIKE_OUT`, and `POB2_SPIKE_DIR` on the PoB2 process only. `POB2_DIR` can point at another install. No GGG token was added. The web app does not read these variables.

## 10. Data model / schema changes

None in production. The report shape is research JSON: version, cases, metrics, deltas, and timings. It is not a public package schema.

## 11. Commands executed

- `node spikes/pob2-calculator/run-spike.mjs` — twice. The second run is the saved report. Cold process time was 7559 ms. An earlier run was 8625 ms.
- `npm run format`
- `npm test`
- `npm run typecheck`
- `npm run lint`
- `npm run format:check`

`npm audit` was not run. No package was added.

## 12. Automated tests

The normal suite does not import the spike and does not need the PoB2 executable. It was run to confirm production behavior still passes.

## 13. Manual verification

The probe is the verification. It loaded four fixtures inside PoB2 0.23.1, read calculated metrics, mutated a passive and a helmet, and restored both. A separate click-through of the PoB2 window was not done. The numbers come from `CalcsTab:BuildOutput` and `PassiveSpec:AllocNode`, which are the functions the Calculations tab and the tree click handler call. After the second run, the user's already-open PoB2 process, pid 7356, was still running. The spike process was pid 24292 and was the only process the runner stopped. `Build.lua` no longer contains the hook.

## 14. Errors/issues encountered

The first skill snapshot looked at the display effect's own tables and reported no skill types. The calculated `player.mainSkill` has `skillTypes` and `skillFlags`. The second run reads those.

`conditionFullLife` and clearing `customMods` did not change the whitelisted totals on fixture E. The values are present in `configTab.input`. The line `Added fire damage` is not evidence that PoB2 added fire damage.

Lua heap use climbed by about 33 MB on each build reload in the same process, from about 175 MB to about 305 MB across five loads, even when the reloaded metrics matched.

## 15. Security/privacy impact

Fixtures are the existing local test builds. The probe restores `Settings.xml` byte for byte. Custom modifier text is parsed as modifier lines, not passed to `load` or `loadstring` in `ModParser.lua`. The PoB2 process can still read and write its user directory and can start an update check. A future worker needs a sandbox and updates disabled. The web app does not gain a new runtime.

## 16. Performance impact

None for the app. Spike timings are in the benchmark section below.

## 17. Data provenance / reproducibility impact

Fixture codes B, C, E, and F are unchanged. They were exported from this same PoB2 0.23.1 install. The report records manifest version `0.23.1`, branch `master`, platform `win32`. The changelog date for 0.23.1 is 2026/07/28. The fixture files record commit `7d6f530cbdab20389ff8bc6ba97a37ac27f74e41`. The install does not contain a git checkout, so that commit was not re-read from a local `.git` directory.

## 18. Known limitations

The probe opens the real desktop runtime, including its window startup. Linux was not tested. `FullDPS` was 0 while `TotalDPS` and `CombinedDPS` were not, so those names must stay separate. A visual diff against the PoB2 window was not recorded. Memory grows across reloads in one process.

## 19. Decisions made

D-079. Use PoB2 as an external single-build worker later, not as part of the Next.js process. Fail closed on a tree mismatch. Do not share one Lua state across calculations.

## 20. Deviations from planning docs

There is no second interactive PoB2 session to compare against. The comparison is that the spike calls the same calculation and allocation functions the UI calls, and the Spell Damage allocation changed spell damage by 10%. The saved report still includes PoB2's default configuration keys as well as the fixture keys, because `configTab.input` contains both after load.

## 21. Remaining risks

A long-lived worker can leak memory across builds. The update check can use the network. Game-data files shipped inside PoB2 are not covered by a clear redistribution grant in the license file read for this spike. Linux and serverless hosting were not demonstrated.

## 22. Rollback notes

Delete `spikes/pob2-calculator/` and this note, and remove D-079. No production module was edited. If a crashed run left the hook behind, `Build.lua` would contain `POB2_SPIKE_HOOK_BEGIN`. It does not.

## 23. Recommended next step

Stop. Review the go-with-conditions result before any STEP-018B work.

## 24. Completion statement

STEP-018A is complete. PoB2 0.23.1 can load these fixtures, calculate them, and recalculate after a passive or item change. The web app does not depend on that runtime.

## PoB2 Version / Commit

Installed manifest: version `0.23.1`, branch `master`, platform `win32`. Changelog heading: `VERSION[0.23.1][2026/07/28]`. Fixture provenance commit: `7d6f530cbdab20389ff8bc6ba97a37ac27f74e41`. The spike read `launch.versionNumber` as `0.23.1`.

## Research Environment

Windows 10.0.26200. CPU: 12th Gen Intel Core i7-12650H, 16 logical processors, 16070 MB RAM. Runtime: the PoB2 executable's embedded LuaJIT, started from `Launch.lua` with `jit.opt.start`. Executable: `Path of Building-PoE2.exe` under `%AppData%\Path of Building Community (PoE2)`.

## Calculation Architecture

`Launch.lua` loads `Modules/Main.lua`. Main holds one build mode. Calculation is `calcs.buildOutput` in `Modules/Calcs.lua`, with setup in `CalcSetup.lua`, offence in `CalcOffence.lua`, defence in `CalcDefence.lua`, and the active skill in `CalcActiveSkill.lua`. The UI tab wrapper is `Classes/CalcsTab.lua` `BuildOutput`.

## Build Load Path

An export code is URL-safe Base64 around zlib, matching the existing decoder. Inflated XML with root `PathOfBuilding2` is passed to `buildMode:Init(nil, name, xml)`, which calls `LoadDB`. No button click is required. Saved-file load is `LoadDBFile` from a path. The spike used the XML path.

## Calculation Entry Point

`CalcsTab:BuildOutput` calls `calcs.buildOutput(build, "MAIN")` and stores `mainEnv.player.output`. Initialization inside `Init` loads the tree for `treeVersion`, skills, items, and config, then calculates once. Skill selection is `mainSocketGroup` plus `mainActiveSkill` on that socket group. Configuration is `configTab.input`.

## Initialization Requirements

The process needs the PoB2 program directory, its `manifest.xml`, `TreeData`, skill data, and the SimpleGraphic runtime in the executable. The first empty build init is part of cold start. Developer mode is off on this install, so `Launch.lua` also schedules `CheckForUpdate`.

## Baseline Metrics Available

From `player.output` on fixture B, a level 16 Witch with Fireball and no gear: Life 254, Mana 130, Spirit 100, EnergyShield 0, Armour 0, Evasion 7, DeflectionRating 0, DeflectChance 0, FireResist -50, ColdResist -50, LightningResist -50, ChaosResist 0, AverageDamage 5.35, AverageHit 5.35, TotalDPS 4.458333333, CombinedDPS 4.458446466, FullDPS 0, CritChance 7, CritMultiplier 2, Speed 0.8333333333, CastRate 0.8333333333, HitChance 100, TotalEHP 186.6243634. Fixture F, with gear, reported Life 382, Armour 194, Evasion 30, EnergyShield 62, FireResist -20, ColdResist -32.

`TotalDPS`, `CombinedDPS`, and `FullDPS` are different fields. The spike does not collapse them.

## Skill / Effect Metadata Available

The calculated main skill exposes `skillTypes`, `skillFlags`, `supportList`, and the granted effect id and name. Fireball's flags include `spell` and `projectile`. Its types include `Spell`, `Projectile`, `Fire`, and `Area`. The support list contains Rapid Attacks III. Shockwave Slam's flags include `attack`, `melee`, `area`, and `totem`. Its types include `Attack`, `Melee`, `Slam`, and `UsedByTotem`. The support list contains Magnified Area II. This is a usable future source for character-context tags. It is not wired into production context.

## Primary Active Effect Fidelity

Fixture C's gem is Shockwave Totem, `ShockwaveTotemPlayer`. The selected display skill is index 2, name Shockwave Slam, effect id `ShockwaveTotemQuakePlayer`. The source gem remains Shockwave Totem. The raw gem is not the active effect.

## Passive Mutation

`PassiveSpec:AllocNode` allocated node 4739, named Spell Damage, in 40 ms including `BuildOutput`. AverageDamage, AverageHit, and TotalDPS rose by 10%. A second connected node, 44871 Energy Shield, was allocated and added 10 Energy Shield. `RestoreUndoState` returned the metrics to the baseline. Path legality is enforced by PoB2's `GetEffectiveAllocationPath`. Buddy's passive engine would still choose the candidate. PoB2 is the evaluator.

## Weapon-Set Handling

Shared nodes in these fixtures use `allocMode` 0. Setting `spec.allocMode` to 1 and allocating node 4739 stored `node.allocMode` 1. A candidate edit has to say which weapon-set mode is active. Weapon-set counts on these fixtures were 0. The undo restore matched the baseline.

## Ascendancy Handling

Loading the build sets class id 1, Witch, ascendancy id 1, Infernalist. Node 32699 is present, allocated, type `AscendClassStart`, with `ascendancyName` Infernalist. `CountAllocNodes` still reported 0 allocated and 0 ascendancy points, because the class and ascendancy starts are not spent points. The calculation instance includes them without a separate call.

## Item Mutation

Fixture F's Helmet slot held item id 5. Replacing it with a local rare Wrapped Greathelm whose raw text grants `+80 to maximum Life` changed Life from 382 to 464, Armour from 194 to 144, and TotalEHP from 331.5453384 to 396.638227. Restoring the previous item id matched the baseline. The raw text is the same kind of text `NormalizedItem.rawText` already stores. The slot name must be a PoB2 slot such as `Helmet`. The item needs an id from `AddItem`. No trade data was used.

## Skill / Support Mutation

Raising the Fireball gem from level 1 to level 2, then calling `SkillsTab:ProcessSocketGroup` and `BuildOutput`, changed metrics in 18 ms. Restoring level 1 matched the baseline. The source shows `mainActiveSkill` and group enabled flags can be changed on the socket group. A support add/remove was not given its own mutation. The support list is already visible on the calculated skill.

## Configuration Handling

Fixture E's loaded input includes `conditionFullLife` true, `customMods` `Added fire damage`, and `detonateDeadCorpseLife` 5000, plus many PoB2 default inputs. Toggling full life and clearing custom mods did not change the whitelisted totals, and both restores matched. PoB2 applies custom lines only when `modLib.parseMod` accepts them. This line did not move the measured totals.

## Delta Prototype

The report stores metric, before, after, absoluteDelta, and percentDelta only when both values are numbers and the baseline is not 0 for the percentage. Different metrics are not added together.

## Determinism

Five `BuildOutput` calls on the same loaded build kept the same metric table. Times were 21, 20, 23, 20, and 17 ms.

## Mutation Isolation

Fixture B, then C, then B again: the second B metric table matched the first. Passive undo, item restore, skill-level restore, weapon-set undo, and configuration restore each matched the baseline taken before that change.

## Performance Benchmarks

Environment: the machine above, one PoB2 process, two cold starts.

| Operation                     | Result                                                     |
| ----------------------------- | ---------------------------------------------------------- |
| Cold process, both runs       | 8625 ms, then 7559 ms                                      |
| Build load inside the process | 203, 173, 181, 205, and 225 ms for B, C, E, F, and B again |
| Recalculation, 5 trials       | 17–23 ms, middle value 20 ms                               |
| One passive plus recalc       | 40 ms                                                      |
| Second node plus recalc       | 38 ms                                                      |
| Helmet replace plus recalc    | 27 ms                                                      |
| Gem level plus recalc         | 18 ms                                                      |
| Config toggle plus recalc     | 18 ms                                                      |

Lua heap after each load: about 175, 207, 239, 272, and 305 MB. Trials for the cold start: 2. Trials for recalc: 5.

## Candidate-Scale Estimate

Assumption: after one process is warm and one build is loaded, each candidate is one mutation plus one `BuildOutput`, about 40 ms, and the cost stays linear. Startup is paid once.

| Candidates | In-process estimate | Plus one cold start |
| ---------- | ------------------- | ------------------- |
| 10         | about 0.4 s         | about 8 s           |
| 50         | about 2 s           | about 10 s          |
| 100        | about 4 s           | about 12 s          |
| 500        | about 20 s          | about 28 s          |

A new process per candidate is not practical, because cold start is about 8 seconds. Evaluating every passive-search candidate inside one process is possible for a shortlist of about 100. A 500-candidate loop is a multi-second block and should stay behind the existing heuristic shortlist. Memory growth means a worker should be recycled after a bounded number of builds.

## Runtime Architecture Options

| Option                      | What the spike shows                                                      |
| --------------------------- | ------------------------------------------------------------------------- |
| A. Process per calculation  | Works, and wastes about 8 seconds per call                                |
| B. Long-lived LuaJIT worker | Matches the measured in-process recalc. One build at a time               |
| C. Sidecar service          | Same worker, reached over a local socket. Not built                       |
| D. Embedded Lua in Node     | Not tried. The runtime is SimpleGraphic plus LuaJIT, not a plain Lua file |
| E. WASM                     | No evidence in this install                                               |
| F. Other                    | No second engine was found                                                |

## Recommended Runtime Direction

A long-lived local worker, option B or C, with a queue and one build object. Recycle the process when memory climbs. Do not embed it in Next.js. This is a prototype direction, not a permanent hosting choice.

## Server Deployment Constraints

The current Next.js app cannot host this runtime as it exists. The calculator needs the native PoB2 executable, LuaJIT inside SimpleGraphic, the program data files, and a writable user path on this install. It is a persistent process, not a serverless function. This spike ran on Windows only. Linux was not shown. The update check is Windows-install behavior in `Launch.lua` when developer mode is off.

## Local/Desktop Option

A local companion is materially simpler than a server-hosted engine. The executable, data files, and LuaJIT already run on the desktop. A server would have to ship that runtime, pin its version, disable updates, and sandbox the process. The local option avoids putting that runtime in the web deploy.

## Licensing Review

`LICENSE.md` in the install grants the Path of Building Community program under the MIT license in the David Gowor notice, which allows use, modification, and distribution if the notice is kept. LuaJIT and SimpleGraphic are also MIT in that file. `base64.lua` is included under the GNU Library General Public License text in the same file. libcurl has its own notice. Some fonts are under the SIL Open Font License. Whether the bundled game-derived tree and skill data may be redistributed is not stated as a grant in the sections read. That point is flagged for legal review before anyone bundles the runtime or the data files. A separate service does not remove those obligations if the service ships the same files. This is not a legal opinion.

## Third-Party Data / Licensing

| Piece                                | Source in the install      | Notice seen             | Redistribution                                                 |
| ------------------------------------ | -------------------------- | ----------------------- | -------------------------------------------------------------- |
| PoB2 program                         | Path of Building Community | MIT notice              | Allowed with the notice, subject to review of the whole bundle |
| SimpleGraphic                        | same license file          | MIT                     | Same                                                           |
| LuaJIT                               | same license file          | MIT                     | Same                                                           |
| base64.lua                           | same license file          | LGPL text               | Obligations differ from MIT; review before bundling            |
| libcurl                              | same license file          | curl notice             | Review before bundling                                         |
| Fonts                                | same license file          | SIL Open Font License   | Font-specific rules                                            |
| TreeData and skill stat descriptions | program data files         | No separate grant found | Do not copy into this repo; legal review before shipping       |

No PoB2 assets were copied into this repository.

## Version Compatibility

PoB2 stores `targetVersion` `0_1` and passive `treeVersion` `0_5` on these fixtures. Buddy's pinned GGG snapshot is version `0.5.5`. Those strings are different namespaces. `0_5` corresponded to the same node ids as the pin for the ids below. A future rule should compare an explicit mapping, such as PoB2 tree `0_5` to GGG pin `0.5.5`, and refuse to calculate when the mapping does not match. It should not treat the strings as equal just because they both contain 5.

## Passive Node-ID Mapping

No transformation was observed.

| Id    | PoB2 name    | PoB2 type        | Matches Buddy's id use |
| ----- | ------------ | ---------------- | ---------------------- |
| 54447 | WITCH        | ClassStart       | Class start            |
| 4739  | Spell Damage | Normal           | Same id                |
| 18845 | Spell Damage | Normal           | Same id                |
| 1755  | Spell Damage | Normal           | Same id                |
| 41965 | Spell Damage | Normal           | Same id                |
| 32699 | Infernalist  | AscendClassStart | Ascendancy start       |

## Error Model

The runner reports a missing executable, a missing `Build.lua` anchor, a process exit before the report, and a 180 second timeout. Inside PoB2, a failed `loadfile` or probe error is written as JSON `ok: false`. Future integration should map these to structured errors: build failed to load, skill cannot calculate, missing game data, unknown passive id, invalid item, unsupported configuration, engine crash, and timeout. Do not return raw Lua stacks to users.

## Timeout / Cancellation

No cancellation API was found on `BuildOutput`. The Node runner kills the spike process at 180 seconds. A future worker needs a timeout, a process kill, and a worker reset after a kill. Request cancellation means abandoning that process or that queued job, not interrupting Lua mid-call.

## Concurrency

Not proven safe. `Main` has one `BUILD` mode. The spike assumes one calculation at a time. A future design needs one build per worker, a queue, and process isolation between workers.

## State Contamination

Reloading fixture B after fixture C reproduced B's metrics, so the numeric output did not leak. The Lua heap did not return to the earlier size. Two builds are safe only as a sequence on one object, not as concurrent users of that object. Separate processes do not share that Lua state.

## Security Boundary

Imported XML is parsed by PoB2's XML parser. Custom mods go through `modLib.parseMod`. `ModParser.lua` has no `loadstring`. The process still has filesystem access to its user path, can be told to exit, and can start an update check. Network access is not required to calculate from local data, but it is not blocked. A future worker should be sandboxed and should not run the update check.

## Network Dependency

Calculation used local files. `Launch.lua` calls `CheckForUpdate` when developer mode is off and this is not the first-run installer path. A future worker should disable that check. This spike did not capture packets.

## UI Cross-Validation

No second manual reading of the PoB2 window was taken. The spike's baseline is the table `CalcsTab:BuildOutput` fills for the Calculations tab. Fixture C's selected effect name is Shockwave Slam, which is the display skill stored in the fixture truth file.

## Passive Delta Cross-Validation

The same limitation applies. Allocating node 4739, whose PoB2 name is Spell Damage, raised AverageDamage and TotalDPS by 10%. That matches a 10% spell-damage effect on this Fireball build. It is not a screenshot of the UI.

## Item Delta Cross-Validation

The helmet swap was not repeated by hand in the UI. The engine accepted the raw item text and the Life and Armour totals moved in the expected direction, then returned when the original item id was selected again.

## Capability Matrix

| Capability                | Status                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------ |
| Build loading             | proven                                                                               |
| Baseline calculation      | proven                                                                               |
| Metric extraction         | proven                                                                               |
| Skill metadata            | proven                                                                               |
| Passive mutation          | proven                                                                               |
| Weapon-set mutation       | proven                                                                               |
| Item mutation             | proven                                                                               |
| Skill/support mutation    | proven for gem level; support add/remove not separately run                          |
| Configuration application | proven that inputs load; this fixture's custom line did not move the measured totals |
| Determinism               | proven for five recalculations and a reload                                          |
| Reset/isolation           | proven for metric restore; memory growth remains                                     |
| Server deployment         | not practical for the current Next.js host; a Windows desktop worker is proven       |
| Licensing/redistribution  | blocked pending legal review before bundling; local use of an installed copy worked  |

## Go / No-Go Recommendation

GO WITH CONDITIONS.

Proceed toward a STEP-018B design only if the calculator stays a single-build worker outside the web process, versions fail closed, the worker is sandboxed and does not auto-update, and bundling is not assumed until the license review is done. The measured in-process recalc is fast enough for a heuristic shortlist of about 100 candidates. It is not fast enough, and not safe enough, to spawn a process per candidate or to share one Lua state across requests.

## Remaining Blockers

Legal review before redistributing PoB2 or its game-derived data. A worker reset policy for the memory growth. An explicit version map from PoB2 tree `0_5` to the GGG pin. Linux is untested. The update check must be disabled. STEP-018B itself is not approved by this spike.

## STEP-018B Readiness

The calculation interface is real enough to design a delta evaluator: load, mutate a passive or item, read named metrics, restore. That evaluator is not implemented. Production recommendations are unchanged.
