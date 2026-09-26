# Packages

These folders reserve the module boundaries from the technical architecture. They do not contain game logic yet.

| Folder            | Future responsibility                                           |
| ----------------- | --------------------------------------------------------------- |
| `domain`          | Normalized PoE2 types                                           |
| `data-sources`    | Adapters for GGG, the passive-tree export, RePoE, and poe.ninja |
| `passive-engine`  | Passive graph, reachability, and legal paths                    |
| `scoring-engine`  | Configurable heuristic scoring                                  |
| `gear-engine`     | Item normalization and upgrade targets                          |
| `crafting-engine` | Crafting rules, added only after passive and gear work          |
