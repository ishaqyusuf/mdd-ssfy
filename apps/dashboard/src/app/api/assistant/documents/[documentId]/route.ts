import { getServerAuthSession } from "@/lib/auth/session";
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
	const token = process.env.BLOB_READ_WRITE_TOKEN;
	if (!token) {
		return Response.json(
			{ error: "Private file storage is not configured." },
			{ status: 503 },
		);
	}
	const result = await get(document.pathname, {
		access: "private",
		token,
		useCache: true,
	});
	if (!result || result.statusCode !== 200) {
		return Response.json({ error: "File not found." }, { status: 404 });
	}
	const filename = (document.filename || "assistant-document").replace(
		/["\r\n]/g,
		"",
	);
	return new Response(result.stream, {
		headers: {
			"Content-Type":
				document.mimeType ||
				result.blob.contentType ||
				"application/octet-stream",
			"Content-Disposition": `inline; filename="${filename}"`,
			"Cache-Control": "private, no-store",
			"X-Content-Type-Options": "nosniff",
		},
	});
}
