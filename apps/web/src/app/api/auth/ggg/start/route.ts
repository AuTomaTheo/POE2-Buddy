import {
  gggCookieIsSecure,
  readGggLiveImportReadiness,
} from "@poe2-helper/data-sources";
import {
  handleGggAuthStart,
  serverGggOAuthSessionStore,
} from "../../../../../server/ggg-auth-route";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  return handleGggAuthStart(
    readGggLiveImportReadiness(process.env),
    serverGggOAuthSessionStore(),
    { secure: gggCookieIsSecure(url.protocol, process.env.NODE_ENV) },
  );
}
