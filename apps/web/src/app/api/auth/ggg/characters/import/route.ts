import {
  getPinnedPassiveTreeSnapshot,
  readGggLiveImportReadiness,
} from "@poe2-helper/data-sources";
import {
  handleGggCharacterImport,
  serverGggAccessSessionStore,
} from "../../../../../../server/ggg-auth-route";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const readiness = readGggLiveImportReadiness(process.env);
  const tree =
    readiness.status === "ready"
      ? treePin()
      : { nodeIds: new Set<number>(), source: "disabled" };
  return handleGggCharacterImport({
    name: url.searchParams.get("name") ?? "",
    readiness,
    cookieHeader: request.headers.get("cookie"),
    tokens: serverGggAccessSessionStore(),
    tree,
  });
}

function treePin() {
  const snapshot = getPinnedPassiveTreeSnapshot();
  return {
    nodeIds: new Set(snapshot.nodes.map((node) => node.id)),
    source: snapshot.version.source,
    version: snapshot.version.version,
    commit: snapshot.version.commit,
  };
}
