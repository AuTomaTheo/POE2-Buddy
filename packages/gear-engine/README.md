# Gear engine

Understands equipped items. This package does not score slots, price items, rank gear, or recommend upgrades.

`analyzeEquipment` is the provider-neutral entry. It accepts normalized items from a PoB2 import, a GGG import, or a fixture. It maps known slot strings to canonical slots, parses modifier lines with an inventoried grammar, and reports coverage, confidence, and factual diagnostics. Unknown lines stay visible. They are not zero, and they are not an item-quality judgment. Locality uses the item slot and base-defence property lines. When that evidence does not prove local or global, locality stays `unknown`. Conditional lines stay conditional.

`GEAR_NORMALIZATION_VERSION` is 3. It is not the PoB2 normalization version or the passive scoring profile version. Ordinary increased Cast Speed is global. Bare increased Elemental Damage stays unknown. `with Attacks` or `with Spells` on that Elemental Damage line is global.

`normalizeGearItem` is the earlier classifier. It still maps a line only when the passive semantic map already names that line. The analysis screen does not use it.
