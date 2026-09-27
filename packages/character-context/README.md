# Character context

Explains which mechanic families have evidence in an imported build.

`buildCharacterContext` accepts normalized skills, passive semantic ids, gear modifier results, ascendancy identity, and stored configuration. It does not parse PoB2 XML, score items, rank upgrades, or calculate damage or defence totals.

`CHARACTER_CONTEXT_VERSION` is 1. It is not the PoB2, gear, or passive scoring version.

Relevance is `relevant`, `no-evidence`, or `unresolved`. No supported evidence is not the same thing as an unresolved line. Neither state is a judgment that a mechanic is useless.
