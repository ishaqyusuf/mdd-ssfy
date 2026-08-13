import { getServerAuthSession } from "@/lib/auth/session";
import { db } from "@gnd/db";
import {
	decryptSpecialOrderSignature,
	getSpecialOrderSignatureBlobAccess,
} from "@gnd/sales/special-order/signature-storage";
import { get } from "@vercel/blob";

type RouteContext = {
	params: Promise<{ evidenceId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
	const session = await getServerAuthSession(new Headers(request.headers));
	if (!session?.user?.id) {
		return Response.json({ error: "Sign in required." }, { status: 401 });
	}
	if (!session.can.viewOrders && !session.can.editOrders) {
		return Response.json({ error: "Access denied." }, { status: 403 });
	}
	const { evidenceId } = await context.params;
	const evidence = await db.specialOrderApprovalEvidence.findFirst({
		where: { id: evidenceId },
		select: { signatureDocumentId: true },
	});
	if (!evidence?.signatureDocumentId) {
		return Response.json({ error: "Signature not found." }, { status: 404 });
	}
	const document = await db.storedDocument.findFirst({
		where: {
			id: evidence.signatureDocumentId,
			ownerType: "special-order-approval-evidence",
			ownerId: evidenceId,
			kind: "special-order-signature",
			visibility: "private",
			status: "ready",
			deletedAt: null,
		},
		select: { pathname: true, mimeType: true, provider: true, meta: true },
	});
	if (!document?.pathname) {
		return Response.json({ error: "Signature not found." }, { status: 404 });
	}
	const token =
		process.env.SPECIAL_ORDER_BLOB_READ_WRITE_TOKEN ||
		process.env.BLOB_READ_WRITE_TOKEN;
	if (!token) {
		return Response.json(
			{ error: "Private signature storage is not configured." },
			{ status: 503 },
		);
	}
	const encrypted = document.provider === "vercel-blob-encrypted";
	const result = await get(document.pathname, {
		access: encrypted ? getSpecialOrderSignatureBlobAccess() : "private",
		token,
		useCache: true,
	});
	if (!result || result.statusCode !== 200) {
		return Response.json({ error: "Signature not found." }, { status: 404 });
	}
	let body: BodyInit = result.stream;
	if (encrypted) {
		try {
			const envelope = Buffer.from(
				await new Response(result.stream).arrayBuffer(),
			);
			body = decryptSpecialOrderSignature(envelope).buffer;
		} catch {
			return Response.json(
				{ error: "Signature could not be decrypted." },
				{ status: 500 },
			);
		}
	}
	return new Response(body, {
		headers: {
			"Content-Type": document.mimeType || "image/png",
			"Content-Disposition": 'inline; filename="special-order-signature.png"',
			"Cache-Control": "private, max-age=300",
			"X-Content-Type-Options": "nosniff",
		},
	});
}
