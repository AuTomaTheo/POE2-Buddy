export type DemoKind = "pob2" | "fixture" | "page";

export type StartDemo = {
  id: string;
  title: string;
  lead: string;
  shows: readonly string[];
  technicalId: string;
  kind: DemoKind;
  href: string;
  objective: "offensive" | "defensive" | "balanced";
};

export const START_DEMOS: readonly StartDemo[] = [
  {
    id: "fireball-witch",
    title: "Fireball Witch",
    lead: "A Path of Building witch that uses Fireball.",
    shows: [
      "Path of Building import",
      "Passive recommendations",
      "Build context",
      "Exact measurement when the calculator is enabled",
    ],
    technicalId: "A",
    kind: "pob2",
    href: "/build?demo=fireball-witch",
    objective: "offensive",
  },
  {
    id: "gear-parsing",
    title: "Gear parsing example",
    lead: "Equipped items with local, global, and uncertain modifiers.",
    shows: [
      "Gear text",
      "Local and global modifiers",
      "Lines that could not be classified",
    ],
    technicalId: "F",
    kind: "pob2",
    href: "/build?demo=gear-parsing#gear",
    objective: "offensive",
  },
  {
    id: "upgrade-comparison",
    title: "Upgrade comparison example",
    lead: "The same build, opened at the item comparison. You still paste the two items.",
    shows: [
      "Supplied item comparison",
      "A budget for one item",
      "Measured trade-offs when the calculator is enabled",
    ],
    technicalId: "F",
    kind: "pob2",
    href: "/build?demo=upgrade-comparison#upgrades",
    objective: "offensive",
  },
  {
    id: "passive-recommendation",
    title: "Passive recommendation demo",
    lead: "A small witch demo for the heuristic score.",
    shows: ["Heuristic score", "Fully valued paths"],
    technicalId: "witch-offensive.json",
    kind: "fixture",
    href: "/build?demo=passive-recommendation#passives",
    objective: "offensive",
  },
  {
    id: "defensive-warrior",
    title: "Defensive warrior demo",
    lead: "A small warrior demo with a defensive objective.",
    shows: ["Heuristic score", "Defensive objective"],
    technicalId: "warrior-defensive.json",
    kind: "fixture",
    href: "/build?demo=defensive-warrior",
    objective: "defensive",
  },
  {
    id: "crafting-example",
    title: "Crafting example",
    lead: "Eligible modifiers for a supported base. This does not simulate a craft.",
    shows: [
      "Source-pool eligibility",
      "An unsupported class stays unsupported",
    ],
    technicalId: "craft-targets",
    kind: "page",
    href: "/build/crafting",
    objective: "offensive",
  },
];

export function findStartDemo(id: string): StartDemo | undefined {
  return START_DEMOS.find((demo) => demo.id === id);
}
