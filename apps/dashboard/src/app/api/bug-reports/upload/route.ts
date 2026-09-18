import { getServerAuthSession } from "@/lib/auth/session";
import {
	authorizeBugReportUpload,
	canCompleteBugReportUpload,
} from "@/lib/bug-report-upload-policy";
import { BUG_REPORT_MAX_UPLOAD_SIZE_BYTES } from "@api/schemas/bug-reports";
import { db } from "@gnd/db";
import { getUserErrorMessage } from "@gnd/errors";
import { buildErrorReport } from "@gnd/observability";
import * as Sentry from "@sentry/nextjs";
import { type HandleUploadBody, handleUpload } from "@vercel/blob/client";
import { z } from "zod";

const BUG_REPORT_UPLOAD_PREFIX = "bug-reports/";
const BUG_REPORT_UPLOAD_TOKEN_TTL_MS = 10 * 60 * 1000;
const uploadPayloadSchema = z.object({ intentId: z.string().min(1) });

function cleanBlobPathname(value: string) {
	return value.replace(/^\/+/, "");
}

function getBlobToken() {
	return process.env.BUG_REPORT_BLOB_READ_WRITE_TOKEN || "";
}

export async function POST(request: Request) {
	const body = (await request.json()) as HandleUploadBody;
	const token = getBlobToken();

	if (!token) {
		return Response.json(
			{ error: "File upload is temporarily unavailable." },
			{ status: 500 },
		);
	}

	let actor: {
		userId: number;
	} | null = null;

	if (body.type === "blob.generate-client-token") {
		const session = await getServerAuthSession(new Headers(request.headers));

		if (!session?.user?.id) {
			return Response.json(
				{ error: "You must be signed in." },
				{ status: 401 },
			);
		}

		if (!session.can?.submitBugReport) {
			return Response.json(
				{ error: "Bug reporting is not enabled for your account." },
				{ status: 403 },
			);
		}

		actor = {
			userId: session.user.id,
		};
	}

	try {
		const jsonResponse = await handleUpload({
			body,
			request,
			token,
			async onBeforeGenerateToken(pathname, clientPayload) {
				if (!actor) {
					throw new Error("Bug report upload is not authorized.");
				}
				const payload = uploadPayloadSchema.parse(
					JSON.parse(clientPayload || "{}"),
				);
				const intent = await db.bugReportUploadIntent.findUnique({
					where: { id: payload.intentId },
				});
				const cleanPathname = cleanBlobPathname(pathname);
				const userPrefix = `${BUG_REPORT_UPLOAD_PREFIX}${actor.userId}/`;
				if (!cleanPathname.startsWith(userPrefix)) {
					throw new Error("Bug report upload path is invalid.");
				}
				const authorized = authorizeBugReportUpload(intent, {
					actorId: actor.userId,
					pathname: cleanPathname,
					now: new Date(),
				});

				return {
					allowedContentTypes: [authorized.contentType],
					maximumSizeInBytes: Math.min(
						authorized.maximumSizeInBytes,
						BUG_REPORT_MAX_UPLOAD_SIZE_BYTES,
					),
					validUntil: Date.now() + BUG_REPORT_UPLOAD_TOKEN_TTL_MS,
					addRandomSuffix: false,
					allowOverwrite: false,
					tokenPayload: JSON.stringify({
						intentId: authorized.intentId,
						userId: actor.userId,
						pathname: authorized.pathname,
					}),
				};
			},
			async onUploadCompleted({ blob, tokenPayload }) {
				const payload = z
					.object({
						intentId: z.string().min(1),
						userId: z.number().int().positive(),
						pathname: z.string().min(1),
					})
					.parse(JSON.parse(tokenPayload || "{}"));
				const intent = await db.bugReportUploadIntent.findUnique({
					where: { id: payload.intentId },
				});
				if (
					!canCompleteBugReportUpload(intent, {
						actorId: payload.userId,
						pathname: blob.pathname,
						contentType: blob.contentType,
						size: blob.size,
						now: new Date(),
					})
				) {
					throw new Error("Bug report upload completion is invalid.");
				}
				await db.bugReportUploadIntent.updateMany({
					where: {
						id: payload.intentId,
						createdById: payload.userId,
						pathname: payload.pathname,
						state: { in: ["PENDING", "READY"] },
						expiresAt: { gt: new Date() },
						expectedMimeType: blob.contentType,
						expectedSize: blob.size,
					},
					data: {
						state: "READY",
						verifiedMimeType: blob.contentType,
						verifiedSize: blob.size,
						verifiedStorageUrl: blob.url,
					},
				});
			},
		});

		return Response.json(jsonResponse);
	} catch (error) {
		const report = buildErrorReport(error, {
			requestId: request.headers.get("x-request-id") ?? undefined,
			runtime: "dashboard",
			source: "bug-report-upload",
		});
		if (report.classified.reportable) {
			Sentry.captureException(report.reportableError, report.captureContext);
		}
		return Response.json(
			{ error: getUserErrorMessage(error) },
			{ status: 400 },
		);
	}
}
