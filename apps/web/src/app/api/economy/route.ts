import {
  handleEconomyGet,
  serverPoeNinjaClient,
} from "../../../server/economy-route";

export async function GET(request: Request): Promise<Response> {
  const contact = process.env.POE2_NINJA_CONTACT?.trim() ?? "";
  const client = contact.length === 0 ? null : serverPoeNinjaClient(contact);
  return handleEconomyGet(new URL(request.url), client);
}
