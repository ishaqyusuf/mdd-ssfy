import { getServerAuthSession } from "@/lib/auth/session";
import { requireStorefrontEmployeePermission } from "@api/utils/storefront-permissions";
import { db } from "@gnd/db";
import { get } from "@vercel/blob";

type RouteContext = {
	params: Promise<{ id: string; documentId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
	const session = await getServerAuthSession(new Headers(request.headers));
	if (!session?.user?.id) {
		return Response.json({ error: "Sign in required." }, { status: 401 });
	}
	try {
		await requireStorefrontEmployeePermission({
			db,
			userId: session.user.id,
			permission: "viewStorefrontOrders",
		});
	} catch {
		return Response.json({ error: "Access denied." }, { status: 403 });
	}

	const { id, documentId } = await context.params;
	const document = await db.storedDocument.findFirst({
		where: {
			id: documentId,
			ownerType: "storefront_inquiry",
			ownerId: id,
			kind: "attachment",
			visibility: "private",
			status: "ready",
			deletedAt: null,
		},
		select: { pathname: true, filename: true, mimeType: true },
	});
	if (!document?.pathname) {
		return Response.json({ error: "File not found." }, { status: 404 });
	}
	const token =
		process.env.STOREFRONT_INQUIRY_BLOB_READ_WRITE_TOKEN ||
		process.env.BLOB_READ_WRITE_TOKEN;
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
	const disposition = `inline; filename="${(document.filename || "attachment").replace(/["\r\n]/g, "")}"`;
	return new Response(result.stream, {
		headers: {
			"Content-Type": document.mimeType || result.blob.contentType,
			"Content-Disposition": disposition,
			"Cache-Control": "private, max-age=300",
			"X-Content-Type-Options": "nosniff",
		},
	});
}
