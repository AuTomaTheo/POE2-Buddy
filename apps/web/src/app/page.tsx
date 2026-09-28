import {
  gggLiveImportPublicStatus,
  readGggLiveImportReadiness,
} from "@poe2-helper/data-sources";
import { Dashboard } from "./dashboard";

export default function Home() {
  const liveImport = gggLiveImportPublicStatus(
    readGggLiveImportReadiness(process.env),
  );
  return (
    <Dashboard
      gggEnabled={liveImport.enabled}
      gggMessage={liveImport.message}
    />
  );
}
