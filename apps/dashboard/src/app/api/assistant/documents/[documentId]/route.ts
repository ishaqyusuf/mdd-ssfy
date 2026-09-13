import { getServerAuthSession } from "@/lib/auth/session";
import { resolveAssistantActor } from "@api/assistant/actor";
import {
	resolveAssistantDocumentAccess,
	trustedAssistantPublicBlobUrl,
} from "@api/assistant/documents";
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
	const token = process.env.BLOB_READ_WRITE_TOKEN;
	if (document.access === "private" && !token) {
		return Response.json(
			{ error: "Private file storage is not configured." },
			{ status: 503 },
		);
	}
	const result =
		document.access === "private"
			? await get(document.pathname, {
					access: "private",
					token,
					useCache: true,
				})
			: null;
	const publicBlobUrl = trustedAssistantPublicBlobUrl(document.url);
	const publicResponse =
		document.access === "public" && publicBlobUrl
			? await fetch(publicBlobUrl, { cache: "no-store" })
			: null;
	if (
		(document.access === "private" && (!result || result.statusCode !== 200)) ||
		(document.access === "public" && !publicResponse?.ok)
	) {
		return Response.json({ error: "File not found." }, { status: 404 });
	}
	const filename = (document.filename || "assistant-document").replace(
		/["\r\n]/g,
		"",
	);
	return new Response(
		document.access === "private" ? result?.stream : publicResponse?.body,
		{
			headers: {
				"Content-Type":
					document.mimeType ||
					result?.blob.contentType ||
					publicResponse?.headers.get("content-type") ||
					"application/octet-stream",
				"Content-Disposition": `inline; filename="${filename}"`,
				"Cache-Control": "private, no-store",
				"X-Content-Type-Options": "nosniff",
			},
		},
	);
}
