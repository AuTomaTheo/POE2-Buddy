# PoB2 calculation spike

Research-only probe for STEP-018A. It is not imported by the web app, and `npm test` does not run it.

The script starts the installed Path of Building (PoE2) executable, asks that process to load stored fixture XML, and writes `results/spike-report.json`. It temporarily inserts a marked hook at the end of `Modules/Build.lua`, then restores the original file and `Settings.xml`.

Run it only when that install is present:

```text
node spikes/pob2-calculator/run-spike.mjs
```

`POB2_DIR` overrides the install directory. The default is the local Roaming Path of Building Community (PoE2) folder.

STEP-018A.1 adds two more research commands. They are also outside `npm test`:

```text
node spikes/pob2-calculator/run-closure.mjs
node spikes/pob2-calculator/run-ui-session.mjs
```

`run-closure.mjs` loads fixtures D, C, and B, reads node ids, disables Magnified Area II, and applies one custom modifier. `run-ui-session.mjs` leaves the PoB2 window open and writes screenshots under `results/ui/`. Both restore `Build.lua` and `Settings.xml`. The hook is still research-only.
