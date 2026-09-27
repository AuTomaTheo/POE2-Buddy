# Packages

These folders reserve the module boundaries from the technical architecture. `domain`, `data-sources`, `passive-engine`, `scoring-engine`, and `gear-engine` have code. The passive engine does not decide which path is better. The scoring engine assigns heuristic scores. The gear engine classifies item text and does not score slots.

| Folder            | Future responsibility                                                                                                   |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `domain`          | Normalized PoE2 types                                                                                                   |
| `data-sources`    | Adapters for external data. Passive-tree, build-fixture, economy, GGG, and pasted PoB2 import adapters are implemented. |
| `passive-engine`  | Adjacency graph, main-tree path search, passive stat grammar, and semantic stat normalization.                          |
| `scoring-engine`  | Configurable heuristic scoring and Top-K recommendations for passive paths                                              |
| `gear-engine`     | Item normalization is implemented. Upgrade targets are not.                                                             |
| `crafting-engine` | Crafting rules, added only after passive and gear work                                                                  |
