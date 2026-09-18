import { getServerAuthSession } from "@/lib/auth/session";
import { canAccessBugReportDocument } from "@/lib/bug-report-document-access";
import { db } from "@gnd/db";
import { get, head } from "@vercel/blob";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
	params: Promise<{ reportId: string; documentId: string }>;
};

function copyBlobHeader(target: Headers, source: Headers, name: string) {
	const value = source.get(name);
	if (value) target.set(name, value);
}

async function serveDocument(
	request: Request,
	context: RouteContext,
	headOnly: boolean,
) {
	const session = await getServerAuthSession(new Headers(request.headers));
	const actorId = Number(session?.user?.id);
	if (!Number.isSafeInteger(actorId) || actorId <= 0) {
		return Response.json({ error: "Sign in required." }, { status: 401 });
	}
	const { reportId, documentId } = await context.params;
	const [report, actor] = await Promise.all([
		db.bugReport.findFirst({
			where: { id: reportId, deletedAt: null },
			select: {
				createdById: true,
				recordingDocumentId: true,
				followUps: {
					where: { deletedAt: null },
					select: { audioDocumentId: true },
				},
			},
		}),
		db.users.findFirst({
			where: { id: actorId, deletedAt: null, accessRevokedAt: null },
			select: {
				roles: {
					where: { deletedAt: null },
					select: { role: { select: { name: true } } },
				},
			},
		}),
	]);
	if (!report || !actor) {
		return Response.json({ error: "File not found." }, { status: 404 });
	}
	const isSuperAdmin = actor.roles.some(
		({ role }) => role.name.toLowerCase() === "super admin",
	);
	if (
		!canAccessBugReportDocument({
			actorId,
			isSuperAdmin,
			reportOwnerId: report.createdById,
			primaryDocumentId: report.recordingDocumentId,
			followUpDocumentIds: report.followUps.map((item) => item.audioDocumentId),
			documentId,
		})
	) {
		return Response.json({ error: "File not found." }, { status: 404 });
	}
	const document = await db.storedDocument.findFirst({
		where: {
			id: documentId,
			ownerType: "bug_report",
			ownerId: reportId,
			visibility: "private",
			status: "ready",
			deletedAt: null,
		},
		select: { pathname: true, filename: true, mimeType: true },
	});
	if (!document?.pathname) {
		return Response.json({ error: "File not found." }, { status: 404 });
	}
	const token = process.env.BUG_REPORT_BLOB_READ_WRITE_TOKEN;
	if (!token) {
		return Response.json(
			{ error: "Bug report evidence storage is not configured." },
			{ status: 503 },
		);
	}
	if (headOnly) {
		const metadata = await head(document.pathname, { token });
		return new Response(null, {
			status: 200,
			headers: {
				"Content-Type": document.mimeType || metadata.contentType,
				"Content-Length": String(metadata.size),
				"Accept-Ranges": "bytes",
				"Cache-Control": "private, no-store",
				"X-Content-Type-Options": "nosniff",
				ETag: metadata.etag,
			},
		});
	}
	const range = request.headers.get("range");
	const result = await get(document.pathname, {
		access: "private",
		token,
		useCache: true,
		...(range ? { headers: { Range: range } } : {}),
	});
	if (!result || result.statusCode === 304 || !result.stream) {
		return Response.json({ error: "File not found." }, { status: 404 });
	}
	const headers = new Headers({
		"Content-Type": document.mimeType || result.blob.contentType,
		"Content-Disposition": `inline; filename="${(document.filename || "bug-report-evidence").replace(/["\r\n]/g, "")}"`,
		"Cache-Control": "private, no-store",
		"X-Content-Type-Options": "nosniff",
	});
	for (const name of [
		"accept-ranges",
		"content-length",
		"content-range",
		"etag",
	]) {
		copyBlobHeader(headers, result.headers, name);
	}
	return new Response(result.stream, {
		status: result.headers.has("content-range") ? 206 : 200,
		headers,
	});
}

export function GET(request: Request, context: RouteContext) {
	return serveDocument(request, context, false);
}

export function HEAD(request: Request, context: RouteContext) {
	return serveDocument(request, context, true);
}
