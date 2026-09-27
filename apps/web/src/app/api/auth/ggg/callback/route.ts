import {
  gggCookieIsSecure,
  readGggLiveImportReadiness,
} from "@poe2-helper/data-sources";
import {
  handleGggAuthCallback,
  serverGggAccessSessionStore,
  serverGggOAuthSessionStore,
} from "../../../../../server/ggg-auth-route";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  return handleGggAuthCallback(
    url,
    request.headers.get("cookie"),
    serverGggOAuthSessionStore(),
    {
      readiness: readGggLiveImportReadiness(process.env),
      tokens: serverGggAccessSessionStore(),
      secure: gggCookieIsSecure(url.protocol, process.env.NODE_ENV),
    },
  );
}
