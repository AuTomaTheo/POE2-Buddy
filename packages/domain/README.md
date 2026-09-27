# Domain

Normalized Path of Exile 2 types for this application. Zod schemas are the runtime check for fixtures and, later, for data loaded from external sources.

This package does not fetch data, talk to the network, or render UI.

A passive node can have more than one structural kind. Ascendancy membership stays in `ascendancyId`. `classStarts` records which skill node each exported class begins on. The export's `root` placeholder is not a node. Weapon-set specialisations stay in `set1`, `set2`, and `set3`. They are not merged into the shared passive allocation. Recommendation scores use `scoreKind: "heuristic"` so they are not treated as exact DPS.

Sample fixtures in `fixtures/` use invented node ids. They prove the shape. They are not a real character or the official passive tree.

A build fixture is a character snapshot plus `goals` (`objective` and `pointBudget`). `pointBudget` is a nonnegative integer. Goals stay off `CharacterBuildSnapshot`. Tree membership for real build files is checked by data-sources, not by this package.

`CharacterSummary` is the short list entry for a named character. It does not carry an access token.

`EconomySnapshot` is a normalized poe.ninja price list. Its `primaryValue` is a market price, not a passive score.

`compareGameDataSources` reports whether a fixture and a tree snapshot name the same source, version, and commit. A missing version or commit is not treated as a match. `fetchedAt` is ignored.
