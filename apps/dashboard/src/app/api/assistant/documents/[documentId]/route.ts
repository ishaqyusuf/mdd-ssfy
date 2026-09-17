import { getServerAuthSession } from "@/lib/auth/session";
import { loadAssistantDocumentProxy } from "@/lib/assistant-document-proxy";
import { resolveAssistantActor } from "@api/assistant/actor";
import { resolveAssistantDocumentAccess } from "@api/assistant/documents";
import { db } from "@gnd/db";
import { get } from "@vercel/blob";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ documentId: string }> };

export async function GET(request: Request, context: RouteContext) {
	const session = await getServerAuthSession(new Headers(request.headers));
	if (!session?.user?.id) {
		return Response.json({ error: "Sign in required." }, { status: 401 });
	}
	const actor = await resolveAssistantActor(db, session.user.id);
	if (!actor) {
		return Response.json({ error: "Access denied." }, { status: 403 });
	}
	const { documentId } = await context.params;
	const document = await resolveAssistantDocumentAccess(db, {
		actor,
		documentId,
	});
	if (!document) {
		return Response.json({ error: "File not found." }, { status: 404 });
	}
	const proxy = await loadAssistantDocumentProxy(
		document,
		process.env.BLOB_READ_WRITE_TOKEN,
		{
			async getPrivate(pathname, token) {
				const result = await get(pathname, {
					access: "private",
					token,
					useCache: true,
				});
				return result
					? {
							statusCode: result.statusCode,
							stream: result.stream,
							contentType: result.blob.contentType ?? null,
						}
					: null;
			},
			fetchPublic: (url) => fetch(url, { cache: "no-store" }),
		},
	);
	if (proxy.status === "storage-unavailable") {
		return Response.json(
			{ error: "Private file storage is not configured." },
			{ status: 503 },
		);
	}
	if (proxy.status !== "ready") {
		return Response.json({ error: "File not found." }, { status: 404 });
	}
	const filename = (document.filename || "assistant-document").replace(
		/["\r\n]/g,
		"",
	);
	return new Response(
		proxy.body,
		{
			headers: {
				"Content-Type":
					document.mimeType ||
					proxy.contentType ||
					"application/octet-stream",
				"Content-Disposition": `inline; filename="${filename}"`,
				"Cache-Control": "private, no-store",
				"X-Content-Type-Options": "nosniff",
			},
		},
	);
}
