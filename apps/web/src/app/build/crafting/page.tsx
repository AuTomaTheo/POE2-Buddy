import {
  PLANNER_SUPPORTED_ITEM_CLASSES,
  PLANNER_UNSUPPORTED_ITEM_CLASSES,
} from "@poe2-helper/crafting-data";
import { CraftTargetPlanner } from "../../craft-targets/craft-target-planner";

export default function CraftingPage() {
  return (
    <CraftTargetPlanner
      supported={[...PLANNER_SUPPORTED_ITEM_CLASSES]}
      unsupported={PLANNER_UNSUPPORTED_ITEM_CLASSES.map(
        (entry) => entry.itemClass,
      )}
    />
  );
}
