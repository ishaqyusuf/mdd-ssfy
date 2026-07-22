import {
	authorizeStorefrontInquiryUpload,
	decodeStorefrontInquiryUploadToken,
	getStorefrontInquiryBlobToken,
} from "@api/db/queries/storefront-inquiries";
import { db } from "@gnd/db";
import { type HandleUploadBody, handleUpload } from "@vercel/blob/client";
import { z } from "zod";

const clientPayloadSchema = z.object({
	inquiryId: z.string().trim().min(1),
	uploadToken: z.string().trim().min(1),
});

const allowedContentTypes = [
	"image/jpeg",
	"image/png",
	"image/webp",
	"image/heic",
	"image/heif",
	"application/pdf",
];

function cleanPathname(value: string) {
	return value.replace(/^\/+/, "");
}

function errorMessage(error: unknown) {
	return error instanceof Error
		? error.message
		: "Unable to authorize project attachment upload.";
}

export async function POST(request: Request) {
	const token = getStorefrontInquiryBlobToken();
	if (!token) {
		return Response.json(
			{ error: "Private project attachments are not configured." },
			{ status: 503 },
		);
	}
	try {
		const body = (await request.json()) as HandleUploadBody;
		const response = await handleUpload({
			body,
			request,
			token,
			async onBeforeGenerateToken(pathname, clientPayload) {
				const payload = clientPayloadSchema.parse(
					JSON.parse(clientPayload || "{}"),
				);
				decodeStorefrontInquiryUploadToken(
					payload.uploadToken,
					payload.inquiryId,
				);
				const clean = cleanPathname(pathname);
				const prefix = `storefront-inquiries/${payload.inquiryId}/`;
				if (!clean.startsWith(prefix) || clean.includes("..")) {
					throw new Error("Project attachment path is invalid.");
				}
				await authorizeStorefrontInquiryUpload(db, payload.inquiryId);
				return {
					allowedContentTypes,
					maximumSizeInBytes: 10 * 1024 * 1024,
					validUntil: Date.now() + 30 * 60 * 1000,
					addRandomSuffix: false,
					allowOverwrite: false,
					tokenPayload: JSON.stringify({ inquiryId: payload.inquiryId }),
				};
			},
			async onUploadCompleted() {
				// Finalization verifies the private blob and registers it atomically.
			},
		});
		return Response.json(response);
	} catch (error) {
		return Response.json({ error: errorMessage(error) }, { status: 400 });
	}
}
