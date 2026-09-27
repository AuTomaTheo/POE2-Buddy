import {
  gggLiveImportPublicStatus,
  readGggLiveImportReadiness,
} from "@poe2-helper/data-sources";
import { ANALYSIS_FIXTURES } from "../server/analyze-passive-build";
import { AnalysisScreen } from "./analysis-screen";

export default function Home() {
  return (
    <AnalysisScreen
      fixtures={ANALYSIS_FIXTURES}
      liveImport={gggLiveImportPublicStatus(
        readGggLiveImportReadiness(process.env),
      )}
    />
  );
}
