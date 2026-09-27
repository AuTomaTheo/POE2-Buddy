import { runPassiveTreeRefreshCli } from "@poe2-helper/data-sources";
import { formatPassiveTreeCompatibility } from "@poe2-helper/passive-engine";
import { assessPassiveTreeRefreshCandidate } from "@poe2-helper/scoring-engine";

runPassiveTreeRefreshCli(process.argv.slice(2), {
  assessCompatibility: assessPassiveTreeRefreshCandidate,
  formatSummary: formatPassiveTreeCompatibility,
})
  .then((exitCode) => {
    process.exitCode = exitCode;
  })
  .catch((error: unknown) => {
    const message =
      error instanceof Error ? error.message : "Passive tree refresh failed.";
    console.error(message);
    process.exitCode = 1;
  });
