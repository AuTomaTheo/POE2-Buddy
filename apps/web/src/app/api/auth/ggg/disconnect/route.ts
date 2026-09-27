import { gggCookieIsSecure } from "@poe2-helper/data-sources";
import {
  handleGggDisconnect,
  serverGggAccessSessionStore,
  serverGggOAuthSessionStore,
} from "../../../../../server/ggg-auth-route";

export async function POST(request: Request): Promise<Response> {
  const url = new URL(request.url);
  return handleGggDisconnect(
    request.headers.get("cookie"),
    serverGggOAuthSessionStore(),
    serverGggAccessSessionStore(),
    gggCookieIsSecure(url.protocol, process.env.NODE_ENV),
  );
}
