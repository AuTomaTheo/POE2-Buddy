# Scoring engine

Turns normalized passive stats into a heuristic score for one objective profile.

`scorePassivePath` returns the path, point cost, `heuristicScore`, `scorePerPoint`, contributions, path semantic coverage, semantic confidence, unsupported raw lines, search completeness, the profile id, and the profile version. It does not return a score by itself. Comparison uses `heuristicScore`. `scorePerPoint` is reported and is not the ranking value. The current profiles are calibration version 1. `weightInventory` lists every semantic id and operation across the three profiles, including explicit `null` weights and ids that a profile does not contain.

Unrecognized and unmapped lines stay on `unsupportedRawLines` and are left out of the sum. Increased, reduced, and added effects are valued only when the profile has a weight for that operation. More, less, penetration, conversion, gain-as-extra, derived-from, and conditional lines stay in the breakdown with `supported: false`. A higher score on a partial path is not a definitive win. A truncated search is the highest-scoring path found within search limits.

This is not DPS, EHP, or an exact combat simulation. `recommendScoredCandidates` returns a Top-K of fully valued paths and a separate list of paths whose full value is unknown. It does not return a bare list of node ids.
