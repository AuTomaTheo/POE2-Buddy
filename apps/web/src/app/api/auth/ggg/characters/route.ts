import { readGggLiveImportReadiness } from "@poe2-helper/data-sources";
import {
  handleGggCharactersGet,
  serverGggAccessSessionStore,
} from "../../../../../server/ggg-auth-route";

export async function GET(request: Request): Promise<Response> {
  return handleGggCharactersGet({
    readiness: readGggLiveImportReadiness(process.env),
    cookieHeader: request.headers.get("cookie"),
    tokens: serverGggAccessSessionStore(),
  });
}
