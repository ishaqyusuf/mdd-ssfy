import { handleMessagingConnection } from "@gnd/api/rest/messaging-connection";

export const runtime = "nodejs";

function withExtensionOrigin(request: Request, response: Response) {
  const origin = request.headers.get("origin");
  if (origin && origin === process.env.MESSAGING_EXTENSION_ORIGIN) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Vary", "Origin");
    response.headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
    response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  }
  return response;
}

export async function POST(request: Request) {
  return withExtensionOrigin(request, await handleMessagingConnection(request));
}

export async function OPTIONS(request: Request) {
  return withExtensionOrigin(request, new Response(null, { status: 204 }));
}
