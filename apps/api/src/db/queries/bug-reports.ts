import { createHash, randomUUID } from "node:crypto";
import {
	type BUG_REPORT_DELIVERY_STATES,
	BUG_REPORT_MAX_AUDIO_DURATION_MS,
	BUG_REPORT_MAX_AUDIO_SIZE_BYTES,
	BUG_REPORT_MAX_DURATION_MS,
	BUG_REPORT_MAX_UPLOAD_SIZE_BYTES,
	type addBugReportFollowUpSchema,
	type createBugReportSchema,
	type createBugReportUploadIntentSchema,
	type listBugReportsSchema,
	type transcribeBugReportFollowUpSchema,
	type updateBugReportStatusSchema,
} from "@api/schemas/bug-reports";
import type { TRPCContext } from "@api/trpc/init";
import {
	buildBugReportEvidenceCaption,
	isBugReportTranscriptionConfigured,
	mergeBugReportTranscriptionMeta,
	transcribeBugReportAudioDocument,
} from "@api/utils/bug-report-transcription";
import {
	getUserSpecificPermissions,
	mergePermissionRecords,
} from "@gnd/auth/utils";
import { getBugReportGithubConfig } from "@gnd/bug-reports";
import { Prisma, type TransactionClient } from "@gnd/db";
import {
	createBugReportDelivery,
	requeueBugReportDelivery,
} from "@gnd/db/queries";
import { generatePermissions } from "@gnd/utils/constants";
import { TRPCError } from "@trpc/server";
import { get, head } from "@vercel/blob";
import type { z } from "zod";

type BugReportStatus =
	| "NEW"
	| "IN_REVIEW"
	| "IN_PROGRESS"
	| "NEEDS_INFO"
	| "FIXED"
	| "CLOSED";

type BugReportCaptureType = "VIDEO" | "SCREENSHOT";
type BugReportTranscriptionStatus =
	| "NOT_REQUESTED"
	| "PENDING"
	| "COMPLETED"
	| "FAILED";
type BugReportDeliveryState = (typeof BUG_REPORT_DELIVERY_STATES)[number];
type BugReportDeliveryProjection = {
	state: BugReportDeliveryState;
	attempts: number;
	nextAttemptAt?: Date | string | null;
	lastErrorCode?: string | null;
	remoteIssueKey?: string | null;
	remoteIssueUrl?: string | null;
};
type HydratableBugReport = {
	id: string;
	status: BugReportStatus;
	captureType?: BugReportCaptureType | null;
	description?: string | null;
	currentUrl?: string | null;
	userAgent?: string | null;
	source?: string | null;
	recordingDocumentId?: string | null;
	durationMs?: number | null;
	microphoneEnabled?: boolean | null;
	externalIssueProvider?: string | null;
	externalIssueKey?: string | null;
	externalIssueUrl?: string | null;
	externalIssueStatus?: string | null;
	externalIssueError?: string | null;
	externalIssueCreatedAt?: Date | string | null;
	statusUpdatedById?: number | null;
	statusUpdatedAt?: Date | string | null;
	createdById: number;
	createdAt?: Date | string | null;
	updatedAt?: Date | string | null;
	followUps?: Array<{ audioDocumentId?: string | null }>;
	delivery?: BugReportDeliveryProjection | null;
	_count?: {
		followUps?: number;
	};
};
type BugReportUserSummary = {
	id: number;
	name: string | null;
	email: string | null;
};
type BugReportDocumentSummary = {
	id: string;
	url: string | null;
	pathname: string;
	filename: string | null;
	mimeType: string | null;
	size: number | null;
	visibility: string;
};
type BugReportAudioDocumentForTranscription = {
	id: string;
	url: string | null;
	pathname: string;
	filename: string | null;
	mimeType: string | null;
	meta: unknown;
};
type BugReportFollowUpForTranscription = {
	id: string;
	bugReportId: string;
	audioDocumentId: string | null;
	bugReport: {
		createdById: number;
		description: string | null;
		recordingDocumentId: string | null;
		deletedAt: Date | string | null;
	};
};

const BUG_REPORT_VIDEO_DOCUMENT_KIND = "bug_report_recording";
const BUG_REPORT_SCREENSHOT_DOCUMENT_KIND = "bug_report_screenshot";
const BUG_REPORT_AUDIO_DOCUMENT_KIND = "bug_report_voice_note";
const BUG_REPORT_OWNER_TYPE = "bug_report";
const BUG_REPORT_UPLOAD_PREFIX = "bug-reports/";
const BUG_REPORT_UPLOAD_INTENT_TTL_MS = 15 * 60 * 1000;

const BUG_REPORT_MEDIA_CONTENT_TYPES = {
	SCREENSHOT: ["image/png", "image/jpeg"],
	VIDEO: ["video/webm", "video/mp4"],
	AUDIO: ["audio/webm", "audio/mp4"],
} as const;

function extensionForBugReportMedia(
	mediaKind: "VIDEO" | "SCREENSHOT" | "AUDIO",
	contentType: string,
) {
	if (contentType.endsWith("png")) return "png";
	if (contentType.endsWith("jpeg")) return "jpg";
	if (contentType.endsWith("mp4")) return "mp4";
	return "webm";
}

function getBugReportDocumentUrl(reportId: string, documentId: string) {
	return `/api/bug-reports/${encodeURIComponent(reportId)}/documents/${encodeURIComponent(documentId)}`;
}

function buildBugReportSubmissionFingerprint(
	input: z.infer<typeof createBugReportSchema>,
) {
	return createHash("sha256")
		.update(
			JSON.stringify({
				captureType: input.captureType || "VIDEO",
				description: input.description?.trim() || null,
				currentUrl: input.currentUrl || null,
				userAgent: input.userAgent || null,
				durationMs: input.durationMs ?? null,
				microphoneEnabled: input.microphoneEnabled,
				upload: {
					pathname: cleanBlobPathname(input.upload.pathname),
					contentType:
						input.upload.contentType ||
						(input.captureType === "SCREENSHOT" ? "image/png" : "video/webm"),
					size: input.upload.size,
					filename: input.upload.filename || null,
				},
				audio: input.audio
					? {
							pathname: cleanBlobPathname(input.audio.upload.pathname),
							contentType: input.audio.upload.contentType || "audio/webm",
							size: input.audio.upload.size,
							filename: input.audio.upload.filename || null,
							durationMs: input.audio.durationMs ?? null,
							transcriptionText: input.audio.transcriptionText?.trim() || null,
							transcriptionProvider: input.audio.transcriptionProvider || null,
							transcriptionStatus: input.audio.transcriptionStatus || "PENDING",
						}
					: null,
			}),
		)
		.digest("hex");
}

function cleanBlobPathname(value: string) {
	return value.replace(/^\/+/, "");
}

function isVideoLike(contentType: string) {
	return (
		contentType.startsWith("video/") ||
		contentType === "application/octet-stream"
	);
}

function isImageLike(contentType: string) {
	return contentType.startsWith("image/");
}

function isAudioLike(contentType: string) {
	return (
		contentType.startsWith("audio/") ||
		contentType === "application/octet-stream"
	);
}

function getDocumentExtension(pathname: string, fallback: string) {
	return pathname.split(".").pop()?.toLowerCase() || fallback;
}

function getPrimaryDocumentKind(captureType: BugReportCaptureType) {
	return captureType === "SCREENSHOT"
		? BUG_REPORT_SCREENSHOT_DOCUMENT_KIND
		: BUG_REPORT_VIDEO_DOCUMENT_KIND;
}

function assertBugReportUpload(
	input: z.infer<typeof createBugReportSchema>,
	actorId: number,
) {
	const pathname = cleanBlobPathname(input.upload.pathname);
	const captureType = input.captureType || "VIDEO";
	const contentType =
		input.upload.contentType ||
		(captureType === "SCREENSHOT" ? "image/png" : "video/webm");

	if (!pathname.startsWith(`${BUG_REPORT_UPLOAD_PREFIX}${actorId}/`)) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Bug report recording path is invalid.",
		});
	}

	if (input.upload.size > BUG_REPORT_MAX_UPLOAD_SIZE_BYTES) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Bug report recording is too large or too long.",
		});
	}

	if (captureType === "VIDEO") {
		if (!input.durationMs || input.durationMs > BUG_REPORT_MAX_DURATION_MS) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Bug report recording is too large or too long.",
			});
		}
		if (!isVideoLike(contentType)) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Bug report recording must be a video file.",
			});
		}
	}

	if (captureType === "SCREENSHOT" && !isImageLike(contentType)) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Bug report screenshot must be an image file.",
		});
	}

	return {
		pathname,
		contentType,
		captureType,
	};
}

function assertBugReportAudioUpload(
	audio?: z.infer<typeof createBugReportSchema>["audio"],
	actorId?: number,
) {
	if (!audio) return null;

	const pathname = cleanBlobPathname(audio.upload.pathname);
	const contentType = audio.upload.contentType || "audio/webm";

	if (
		!actorId ||
		!pathname.startsWith(`${BUG_REPORT_UPLOAD_PREFIX}${actorId}/`)
	) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Bug report voice note path is invalid.",
		});
	}

	if (
		audio.upload.size > BUG_REPORT_MAX_AUDIO_SIZE_BYTES ||
		(audio.durationMs ?? 0) > BUG_REPORT_MAX_AUDIO_DURATION_MS
	) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Bug report voice note is too large or too long.",
		});
	}

	if (!isAudioLike(contentType)) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Bug report voice note must be an audio file.",
		});
	}

	return {
		pathname,
		contentType,
	};
}

function normalizeTranscriptionStatus(
	audio?: z.infer<typeof createBugReportSchema>["audio"],
): BugReportTranscriptionStatus {
	if (!audio) return "NOT_REQUESTED";
	if (audio.transcriptionText?.trim()) return "COMPLETED";
	return audio.transcriptionStatus || "PENDING";
}

async function createVoiceNoteDocument(
	tx: TransactionClient,
	params: {
		actorId: number;
		reportId: string;
		audio: NonNullable<z.infer<typeof createBugReportSchema>["audio"]>;
		title: string;
		verifiedUrl?: string;
	},
) {
	const audioUpload = assertBugReportAudioUpload(params.audio, params.actorId);
	if (!audioUpload) return null;

	return tx.storedDocument.create({
		data: {
			kind: BUG_REPORT_AUDIO_DOCUMENT_KIND,
			ownerType: BUG_REPORT_OWNER_TYPE,
			ownerId: params.reportId,
			provider: "vercel-blob",
			pathname: audioUpload.pathname,
			url: params.verifiedUrl ?? params.audio.upload.url,
			filename: params.audio.upload.filename || `${params.reportId}-voice.webm`,
			mimeType: audioUpload.contentType,
			extension: getDocumentExtension(audioUpload.pathname, "webm"),
			size: params.audio.upload.size,
			visibility: "private",
			status: "ready",
			uploadedBy: params.actorId,
			title: params.title,
			description: params.audio.transcriptionText?.trim() || null,
			meta: {
				durationMs: params.audio.durationMs ?? null,
				transcriptionStatus: normalizeTranscriptionStatus(params.audio),
				transcriptionProvider: params.audio.transcriptionProvider || null,
				transcriptionText: params.audio.transcriptionText?.trim() || null,
				uploadedAt: new Date().toISOString(),
			},
		},
	});
}

function getFollowUpAudioData(
	audio: z.infer<typeof createBugReportSchema>["audio"],
	audioDocumentId?: string | null,
) {
	if (!audio) {
		return {
			audioDocumentId: null,
			audioDurationMs: null,
			transcriptionStatus: "NOT_REQUESTED" as BugReportTranscriptionStatus,
			transcriptionText: null,
			transcriptionProvider: null,
		};
	}

	return {
		audioDocumentId: audioDocumentId ?? null,
		audioDurationMs: audio.durationMs ?? null,
		transcriptionStatus: normalizeTranscriptionStatus(audio),
		transcriptionText: audio.transcriptionText?.trim() || null,
		transcriptionProvider: audio.transcriptionProvider || null,
	};
}

async function loadFollowUpForTranscription(
	ctx: TRPCContext,
	followUpId: string,
) {
	const followUp = await ctx.db.bugReportFollowUp.findFirst({
		where: {
			id: followUpId,
			deletedAt: null,
		},
		select: {
			id: true,
			bugReportId: true,
			audioDocumentId: true,
			bugReport: {
				select: {
					createdById: true,
					description: true,
					recordingDocumentId: true,
					deletedAt: true,
				},
			},
		},
	});

	return followUp as BugReportFollowUpForTranscription | null;
}

async function loadAudioDocumentForTranscription(
	ctx: TRPCContext,
	audioDocumentId: string,
) {
	const audioDocument = await ctx.db.storedDocument.findFirst({
		where: {
			id: audioDocumentId,
			deletedAt: null,
		},
		select: {
			id: true,
			url: true,
			pathname: true,
			filename: true,
			mimeType: true,
			meta: true,
		},
	});

	return audioDocument as BugReportAudioDocumentForTranscription | null;
}

async function requireActor(ctx: TRPCContext) {
	if (!ctx.userId) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "You must be signed in.",
		});
	}

	const user = await ctx.db.users.findFirst({
		where: {
			id: ctx.userId,
			deletedAt: null,
			accessRevokedAt: null,
		},
		select: {
			id: true,
			name: true,
			email: true,
			roles: {
				where: {
					deletedAt: null,
				},
				select: {
					role: {
						select: {
							name: true,
							RoleHasPermissions: {
								where: {
									deletedAt: null,
								},
								select: {
									permission: {
										select: {
											id: true,
											name: true,
										},
									},
								},
							},
						},
					},
				},
			},
		},
	});

	if (!user) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "You must be signed in.",
		});
	}

	const role = user.roles[0]?.role;
	const rolePermissions =
		role?.RoleHasPermissions.map((item) => item.permission) ?? [];
	const specificPermissions = await getUserSpecificPermissions(ctx.db, user.id);
	const can = generatePermissions(
		role?.name,
		mergePermissionRecords(rolePermissions, specificPermissions),
	);
	const isSuperAdmin = role?.name?.toLowerCase() === "super admin";

	return {
		user: {
			id: user.id,
			name: user.name,
			email: user.email,
		},
		roleTitle: role?.name ?? null,
		can,
		isSuperAdmin,
	};
}

async function requireSubmitAccess(ctx: TRPCContext) {
	const actor = await requireActor(ctx);

	if (!actor.can.submitBugReport) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Bug reporting is not enabled for your account.",
		});
	}

	return actor;
}

async function requireSuperAdmin(ctx: TRPCContext) {
	const actor = await requireActor(ctx);

	if (!actor.isSuperAdmin) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Only Super Admin can manage all bug reports.",
		});
	}

	return actor;
}

async function runBugReportFollowUpTranscription(
	ctx: TRPCContext,
	followUpId: string,
) {
	const followUp = await loadFollowUpForTranscription(ctx, followUpId);
	if (!followUp || followUp.bugReport.deletedAt) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Bug report follow-up not found.",
		});
	}

	if (!followUp.audioDocumentId) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Bug report follow-up has no voice note to transcribe.",
		});
	}

	const audioDocument = await loadAudioDocumentForTranscription(
		ctx,
		followUp.audioDocumentId,
	);
	if (!audioDocument?.pathname) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Bug report voice note was not found.",
		});
	}

	if (!isBugReportTranscriptionConfigured()) {
		throw new TRPCError({
			code: "PRECONDITION_FAILED",
			message: "Bug report voice transcription is not configured.",
		});
	}

	const transcriptionStartedAt = new Date().toISOString();

	await Promise.all([
		ctx.db.bugReportFollowUp.update({
			where: {
				id: followUp.id,
			},
			data: {
				transcriptionStatus: "PENDING",
				transcriptionProvider: "groq",
			},
		}),
		ctx.db.storedDocument.update({
			where: {
				id: audioDocument.id,
			},
			data: {
				meta: mergeBugReportTranscriptionMeta(audioDocument.meta, {
					transcriptionStatus: "PENDING",
					transcriptionProvider: "groq",
					transcriptionStartedAt,
				}),
			},
		}),
	]);

	try {
		const transcription = await transcribeBugReportAudioDocument(
			{
				url: audioDocument.url || audioDocument.pathname,
				pathname: audioDocument.pathname,
				filename: audioDocument.filename,
				mimeType: audioDocument.mimeType,
			},
			{
				async readAudio(document) {
					const token = process.env.BUG_REPORT_BLOB_READ_WRITE_TOKEN;
					if (!token || !document.pathname) {
						throw new Error("Bug report evidence storage is not configured.");
					}
					const result = await get(document.pathname, {
						access: "private",
						token,
						useCache: true,
					});
					if (!result || result.statusCode !== 200 || !result.stream) {
						return new Response(null, { status: 404 });
					}
					return new Response(result.stream, {
						headers: { "content-type": result.blob.contentType },
					});
				},
			},
		);
		const completedAt = new Date().toISOString();
		const evidenceCaption = buildBugReportEvidenceCaption(
			followUp.bugReport.description,
			transcription.text,
		);

		await Promise.all([
			ctx.db.bugReportFollowUp.update({
				where: {
					id: followUp.id,
				},
				data: {
					transcriptionStatus: "COMPLETED",
					transcriptionText: transcription.text,
					transcriptionProvider: transcription.provider,
				},
			}),
			!followUp.bugReport.description
				? ctx.db.bugReport.update({
						where: {
							id: followUp.bugReportId,
						},
						data: {
							description: transcription.text,
						},
					})
				: Promise.resolve(),
			followUp.bugReport.recordingDocumentId
				? ctx.db.storedDocument.update({
						where: {
							id: followUp.bugReport.recordingDocumentId,
						},
						data: {
							description: evidenceCaption,
						},
					})
				: Promise.resolve(),
			ctx.db.storedDocument.update({
				where: {
					id: audioDocument.id,
				},
				data: {
					description: transcription.text,
					meta: mergeBugReportTranscriptionMeta(audioDocument.meta, {
						transcriptionStatus: "COMPLETED",
						transcriptionProvider: transcription.provider,
						transcriptionModel: transcription.model,
						transcriptionText: transcription.text,
						transcriptionStartedAt,
						transcriptionCompletedAt: completedAt,
					}),
				},
			}),
		]);

		return {
			followUpId: followUp.id,
			transcriptionStatus: "COMPLETED" as const,
			transcriptionText: transcription.text,
			transcriptionProvider: transcription.provider,
		};
	} catch (error) {
		const message =
			error instanceof Error
				? error.message
				: "Bug report voice transcription failed.";

		await Promise.all([
			ctx.db.bugReportFollowUp.update({
				where: {
					id: followUp.id,
				},
				data: {
					transcriptionStatus: "FAILED",
					transcriptionProvider: "groq",
				},
			}),
			ctx.db.storedDocument.update({
				where: {
					id: audioDocument.id,
				},
				data: {
					meta: mergeBugReportTranscriptionMeta(audioDocument.meta, {
						transcriptionStatus: "FAILED",
						transcriptionProvider: "groq",
						transcriptionError: message,
						transcriptionStartedAt,
						transcriptionFailedAt: new Date().toISOString(),
					}),
				},
			}),
		]);

		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message,
		});
	}
}

async function hydrateReports(
	ctx: TRPCContext,
	reports: HydratableBugReport[],
) {
	const documentIds = Array.from(
		new Set(
			reports.flatMap((report) => [
				report.recordingDocumentId,
				...(report.followUps ?? []).map(
					(followUp: { audioDocumentId?: string | null }) =>
						followUp.audioDocumentId,
				),
			]),
		),
	).filter((id): id is string => typeof id === "string" && id.length > 0);
	const userIds = Array.from(
		new Set(
			reports.flatMap((report) => [
				report.createdById,
				report.statusUpdatedById,
			]),
		),
	).filter((id): id is number => Number.isFinite(id));

	const [documents, users] = await Promise.all([
		documentIds.length
			? ctx.db.storedDocument.findMany({
					where: {
						id: {
							in: documentIds,
						},
						deletedAt: null,
					},
					select: {
						id: true,
						url: true,
						pathname: true,
						filename: true,
						mimeType: true,
						size: true,
						visibility: true,
					},
				})
			: [],
		userIds.length
			? ctx.db.users.findMany({
					where: {
						id: {
							in: userIds,
						},
					},
					select: {
						id: true,
						name: true,
						email: true,
					},
				})
			: [],
	]);

	const documentById = new Map(
		documents.map((document) => [document.id, document] as const),
	);
	const userById = new Map(users.map((user) => [user.id, user] as const));

	return reports.map((report) => {
		const recording = report.recordingDocumentId
			? documentById.get(report.recordingDocumentId)
			: null;
		const createdBy = userById.get(report.createdById) ?? null;
		const statusUpdatedBy = report.statusUpdatedById
			? userById.get(report.statusUpdatedById)
			: null;

		return {
			id: report.id,
			status: report.status as BugReportStatus,
			captureType: (report.captureType || "VIDEO") as BugReportCaptureType,
			description: report.description,
			currentUrl: report.currentUrl,
			userAgent: report.userAgent,
			source: report.source,
			durationMs: report.durationMs,
			microphoneEnabled: report.microphoneEnabled,
			externalIssueProvider: report.externalIssueProvider,
			externalIssueKey: report.externalIssueKey,
			externalIssueUrl: report.externalIssueUrl,
			externalIssueStatus: report.externalIssueStatus,
			externalIssueError: report.externalIssueError,
			externalIssueCreatedAt: report.externalIssueCreatedAt,
			delivery: report.delivery
				? {
						state: report.delivery.state,
						attempts: report.delivery.attempts,
						nextAttemptAt: report.delivery.nextAttemptAt ?? null,
						lastErrorCode: report.delivery.lastErrorCode ?? null,
						issueKey: report.delivery.remoteIssueKey ?? null,
						issueUrl: report.delivery.remoteIssueUrl ?? null,
					}
				: null,
			createdAt: report.createdAt,
			updatedAt: report.updatedAt,
			statusUpdatedAt: report.statusUpdatedAt,
			followUpCount: report._count?.followUps ?? 0,
			recording: recording
				? {
						id: recording.id,
						url: getBugReportDocumentUrl(report.id, recording.id),
						pathname: recording.pathname,
						filename: recording.filename,
						mimeType: recording.mimeType,
						size: recording.size,
						visibility: recording.visibility,
					}
				: null,
			createdBy: createdBy
				? {
						id: createdBy.id,
						name: createdBy.name,
						email: createdBy.email,
					}
				: null,
			statusUpdatedBy: statusUpdatedBy
				? {
						id: statusUpdatedBy.id,
						name: statusUpdatedBy.name,
						email: statusUpdatedBy.email,
					}
				: null,
		};
	});
}

export async function createBugReportUploadIntent(
	ctx: TRPCContext,
	input: z.infer<typeof createBugReportUploadIntentSchema>,
) {
	const actor = await requireSubmitAccess(ctx);
	const allowedContentTypes = BUG_REPORT_MEDIA_CONTENT_TYPES[input.mediaKind];
	if (!allowedContentTypes.includes(input.contentType as never)) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "This bug report media format is not supported.",
		});
	}
	if (
		input.mediaKind === "AUDIO" &&
		input.size > BUG_REPORT_MAX_AUDIO_SIZE_BYTES
	) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "The bug report voice note is too large.",
		});
	}

	const id = randomUUID();
	const extension = extensionForBugReportMedia(
		input.mediaKind,
		input.contentType,
	);
	const pathname = `${BUG_REPORT_UPLOAD_PREFIX}${actor.user.id}/${id}.${extension}`;
	const expiresAt = new Date(Date.now() + BUG_REPORT_UPLOAD_INTENT_TTL_MS);
	await ctx.db.bugReportUploadIntent.create({
		data: {
			id,
			createdById: actor.user.id,
			mediaKind: input.mediaKind,
			pathname,
			expectedMimeType: input.contentType,
			expectedSize: input.size,
			expiresAt,
		},
	});
	return { id, pathname, expiresAt };
}

async function verifyBugReportUploadIntent(
	ctx: TRPCContext,
	input: {
		intentId: string;
		actorId: number;
		mediaKind: "VIDEO" | "SCREENSHOT" | "AUDIO";
		pathname: string;
		contentType: string;
		size: number;
	},
) {
	const intent = await ctx.db.bugReportUploadIntent.findUnique({
		where: { id: input.intentId },
	});
	if (
		!intent ||
		intent.createdById !== input.actorId ||
		intent.mediaKind !== input.mediaKind ||
		intent.pathname !== cleanBlobPathname(input.pathname) ||
		intent.expectedMimeType !== input.contentType ||
		intent.expectedSize !== input.size ||
		intent.expiresAt <= new Date() ||
		!(["PENDING", "READY"] as const).includes(intent.state as never)
	) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "The bug report upload is invalid or expired.",
		});
	}
	const token = process.env.BUG_REPORT_BLOB_READ_WRITE_TOKEN;
	if (!token) {
		throw new TRPCError({
			code: "PRECONDITION_FAILED",
			message: "Bug report storage is not configured.",
		});
	}
	const stored = await head(intent.pathname, { token });
	if (
		stored.pathname !== intent.pathname ||
		stored.size !== intent.expectedSize ||
		stored.contentType !== intent.expectedMimeType
	) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message:
				"The uploaded bug report media does not match its upload intent.",
		});
	}
	await ctx.db.bugReportUploadIntent.update({
		where: { id: intent.id },
		data: {
			state: "READY",
			verifiedMimeType: stored.contentType,
			verifiedSize: stored.size,
			verifiedStorageUrl: stored.url,
		},
	});
	return { ...intent, verifiedStorageUrl: stored.url };
}

async function consumeBugReportUploadIntent(
	tx: TransactionClient,
	input: { intentId: string; actorId: number; reportId: string },
) {
	const changed = await tx.bugReportUploadIntent.updateMany({
		where: {
			id: input.intentId,
			createdById: input.actorId,
			state: "READY",
			consumedReportId: null,
		},
		data: {
			state: "CONSUMED",
			consumedReportId: input.reportId,
		},
	});
	if (changed.count !== 1) {
		throw new TRPCError({
			code: "CONFLICT",
			message: "Bug report evidence is no longer available.",
		});
	}
}

export async function createBugReport(
	ctx: TRPCContext,
	input: z.infer<typeof createBugReportSchema>,
) {
	const actor = await requireSubmitAccess(ctx);
	const upload = assertBugReportUpload(input, actor.user.id);
	const description = input.description?.trim() || null;
	const submissionId = input.submissionId || null;
	const submissionFingerprint = buildBugReportSubmissionFingerprint(input);
	const issueConfig = getBugReportGithubConfig();

	if (submissionId) {
		const existing = await ctx.db.bugReport.findFirst({
			where: {
				createdById: actor.user.id,
				submissionId,
				deletedAt: null,
			},
			include: {
				_count: {
					select: {
						followUps: true,
					},
				},
				delivery: true,
			},
		});
		if (existing) {
			if (existing.submissionFingerprint !== submissionFingerprint) {
				throw new TRPCError({
					code: "CONFLICT",
					message: "This bug report submission has already been saved.",
				});
			}
			const [hydrated] = await hydrateReports(ctx, [existing]);
			return hydrated;
		}
	}

	const primaryIntent = await verifyBugReportUploadIntent(ctx, {
		intentId: input.uploadIntentId,
		actorId: actor.user.id,
		mediaKind: upload.captureType,
		pathname: upload.pathname,
		contentType: upload.contentType,
		size: input.upload.size,
	});
	const audioUpload = input.audio
		? assertBugReportAudioUpload(input.audio, actor.user.id)
		: null;
	if (input.audio && !input.audioUploadIntentId) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "The bug report voice-note upload intent is required.",
		});
	}
	const audioIntent =
		input.audio && input.audioUploadIntentId && audioUpload
			? await verifyBugReportUploadIntent(ctx, {
					intentId: input.audioUploadIntentId,
					actorId: actor.user.id,
					mediaKind: "AUDIO",
					pathname: audioUpload.pathname,
					contentType: audioUpload.contentType,
					size: input.audio.upload.size,
				})
			: null;

	const transactionResult = await ctx.db
		.$transaction(async (tx) => {
			const createdReport = await tx.bugReport.create({
				data: {
					createdById: actor.user.id,
					captureType: upload.captureType,
					description,
					currentUrl: input.currentUrl || null,
					userAgent: input.userAgent || null,
					submissionId,
					submissionFingerprint,
					durationMs: upload.captureType === "VIDEO" ? input.durationMs : null,
					microphoneEnabled: input.microphoneEnabled,
					source: "web",
				},
			});
			const document = await tx.storedDocument.create({
				data: {
					kind: getPrimaryDocumentKind(upload.captureType),
					ownerType: BUG_REPORT_OWNER_TYPE,
					ownerId: createdReport.id,
					provider: "vercel-blob",
					pathname: upload.pathname,
					url: primaryIntent.verifiedStorageUrl,
					filename:
						input.upload.filename ||
						`${createdReport.id}.${upload.captureType === "SCREENSHOT" ? "png" : "webm"}`,
					mimeType: upload.contentType,
					extension: getDocumentExtension(
						upload.pathname,
						upload.captureType === "SCREENSHOT" ? "png" : "webm",
					),
					size: input.upload.size,
					visibility: "private",
					status: "ready",
					uploadedBy: actor.user.id,
					title:
						upload.captureType === "SCREENSHOT"
							? "Bug report screenshot"
							: "Bug report recording",
					description,
					meta: {
						captureType: upload.captureType,
						durationMs: input.durationMs ?? null,
						microphoneEnabled: input.microphoneEnabled,
						currentUrl: input.currentUrl || null,
						userAgent: input.userAgent || null,
						uploadedAt: new Date().toISOString(),
					},
				},
			});

			const updatedReport = await tx.bugReport.update({
				where: {
					id: createdReport.id,
				},
				data: {
					recordingDocumentId: document.id,
				},
				include: {
					_count: {
						select: {
							followUps: true,
						},
					},
				},
			});

			await createBugReportDelivery(tx, {
				reportId: createdReport.id,
				provider: "GITHUB",
				repository: issueConfig?.repository ?? "unconfigured/unconfigured",
				state: issueConfig ? "PENDING" : "UNCONFIGURED",
				now: new Date(),
			});

			await consumeBugReportUploadIntent(tx, {
				intentId: primaryIntent.id,
				actorId: actor.user.id,
				reportId: createdReport.id,
			});
			if (audioIntent) {
				await consumeBugReportUploadIntent(tx, {
					intentId: audioIntent.id,
					actorId: actor.user.id,
					reportId: createdReport.id,
				});
			}

			const audio = input.audio;
			let followUpId: string | null = null;
			if (description || audio) {
				const audioDocument = audio
					? await createVoiceNoteDocument(tx, {
							actorId: actor.user.id,
							reportId: createdReport.id,
							audio,
							title: "Initial bug report voice note",
							verifiedUrl: audioIntent?.verifiedStorageUrl,
						})
					: null;

				const followUp = await tx.bugReportFollowUp.create({
					data: {
						bugReportId: createdReport.id,
						authorId: actor.user.id,
						body:
							description ||
							input.audio?.transcriptionText?.trim() ||
							"Voice note",
						...getFollowUpAudioData(input.audio, audioDocument?.id),
					},
				});
				followUpId = followUp.id;
			}

			return {
				report: updatedReport,
				followUpId,
			};
		})
		.catch(async (error) => {
			if (
				submissionId &&
				error instanceof Prisma.PrismaClientKnownRequestError &&
				error.code === "P2002"
			) {
				const existing = await ctx.db.bugReport.findFirst({
					where: {
						createdById: actor.user.id,
						submissionId,
						deletedAt: null,
					},
					include: {
						_count: {
							select: {
								followUps: true,
							},
						},
						delivery: true,
					},
				});
				if (existing?.submissionFingerprint === submissionFingerprint) {
					return { report: existing, followUpId: null };
				}
			}
			throw error;
		});

	const refreshedReport = await ctx.db.bugReport.findFirst({
		where: {
			id: transactionResult.report.id,
			deletedAt: null,
		},
		include: {
			delivery: true,
			_count: {
				select: {
					followUps: true,
				},
			},
		},
	});
	const [hydrated] = await hydrateReports(ctx, [
		refreshedReport ?? transactionResult.report,
	]);
	return hydrated;
}

export async function retryBugReportIssue(ctx: TRPCContext, reportId: string) {
	await requireSuperAdmin(ctx);
	const report = await ctx.db.bugReport.findFirst({
		where: { id: reportId, deletedAt: null },
		include: { delivery: true },
	});
	if (!report?.delivery) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Bug report delivery was not found.",
		});
	}
	if (["CREATED", "UNCERTAIN", "PROCESSING"].includes(report.delivery.state)) {
		return report.delivery;
	}
	await requeueBugReportDelivery(ctx.db, {
		deliveryId: report.delivery.id,
		now: new Date(),
	});
	return ctx.db.bugReportDelivery.findUnique({
		where: { id: report.delivery.id },
	});
}

export async function getMyBugReports(ctx: TRPCContext) {
	const actor = await requireActor(ctx);
	const reports = await ctx.db.bugReport.findMany({
		where: {
			createdById: actor.user.id,
			deletedAt: null,
		},
		orderBy: {
			createdAt: "desc",
		},
		include: {
			delivery: true,
			_count: {
				select: {
					followUps: true,
				},
			},
		},
	});

	return hydrateReports(ctx, reports);
}

export async function getAllBugReports(
	ctx: TRPCContext,
	input?: z.infer<typeof listBugReportsSchema>,
) {
	await requireSuperAdmin(ctx);
	const reports = await ctx.db.bugReport.findMany({
		where: {
			deletedAt: null,
			status: input?.status,
		},
		orderBy: {
			createdAt: "desc",
		},
		include: {
			delivery: true,
			_count: {
				select: {
					followUps: true,
				},
			},
		},
	});

	return hydrateReports(ctx, reports);
}

export async function getBugReportById(ctx: TRPCContext, id: string) {
	const actor = await requireActor(ctx);
	const report = await ctx.db.bugReport.findFirst({
		where: {
			id,
			deletedAt: null,
		},
		include: {
			delivery: true,
			followUps: {
				where: {
					deletedAt: null,
				},
				orderBy: {
					createdAt: "asc",
				},
			},
			_count: {
				select: {
					followUps: true,
				},
			},
		},
	});

	if (!report) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Bug report not found.",
		});
	}

	if (!actor.isSuperAdmin && report.createdById !== actor.user.id) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "You can only view your own bug reports.",
		});
	}

	const [hydrated] = await hydrateReports(ctx, [report]);
	const authorIds = Array.from(
		new Set(report.followUps.map((followUp) => followUp.authorId)),
	);
	const audioDocumentIds = Array.from(
		new Set(
			report.followUps
				.map((followUp) => followUp.audioDocumentId)
				.filter((id): id is string => typeof id === "string" && id.length > 0),
		),
	);
	const [authors, audioDocuments]: [
		BugReportUserSummary[],
		BugReportDocumentSummary[],
	] = await Promise.all([
		authorIds.length
			? ctx.db.users.findMany({
					where: {
						id: {
							in: authorIds,
						},
					},
					select: {
						id: true,
						name: true,
						email: true,
					},
				})
			: ([] as BugReportUserSummary[]),
		audioDocumentIds.length
			? ctx.db.storedDocument.findMany({
					where: {
						id: {
							in: audioDocumentIds,
						},
						deletedAt: null,
					},
					select: {
						id: true,
						url: true,
						pathname: true,
						filename: true,
						mimeType: true,
						size: true,
						visibility: true,
					},
				})
			: ([] as BugReportDocumentSummary[]),
	]);
	const authorById = new Map(
		authors.map((author) => [author.id, author] as const),
	);
	const audioDocumentById = new Map(
		audioDocuments.map((document) => [document.id, document] as const),
	);

	return {
		...hydrated,
		followUps: report.followUps.map((followUp) => {
			const author = authorById.get(followUp.authorId) ?? null;
			const storedAudio = followUp.audioDocumentId
				? (audioDocumentById.get(followUp.audioDocumentId) ?? null)
				: null;
			const audio = storedAudio
				? {
						...storedAudio,
						url: getBugReportDocumentUrl(report.id, storedAudio.id),
					}
				: null;
			return {
				id: followUp.id,
				body: followUp.body,
				audioDocumentId: followUp.audioDocumentId,
				audioDurationMs: followUp.audioDurationMs,
				transcriptionStatus: followUp.transcriptionStatus,
				transcriptionText: followUp.transcriptionText,
				transcriptionProvider: followUp.transcriptionProvider,
				audio,
				createdAt: followUp.createdAt,
				author: author
					? {
							id: author.id,
							name: author.name,
							email: author.email,
						}
					: null,
			};
		}),
	};
}

export async function addBugReportFollowUp(
	ctx: TRPCContext,
	input: z.infer<typeof addBugReportFollowUpSchema>,
) {
	const actor = await requireActor(ctx);
	const report = await ctx.db.bugReport.findFirst({
		where: {
			id: input.bugReportId,
			deletedAt: null,
		},
		select: {
			id: true,
			createdById: true,
		},
	});

	if (!report) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Bug report not found.",
		});
	}

	if (!actor.isSuperAdmin && report.createdById !== actor.user.id) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "You can only add follow-ups to your own bug reports.",
		});
	}
	const audioUpload = input.audio
		? assertBugReportAudioUpload(input.audio, actor.user.id)
		: null;
	if (input.audio && (!input.audioUploadIntentId || !audioUpload)) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "The bug report voice-note upload intent is required.",
		});
	}
	const audioIntent =
		input.audio && input.audioUploadIntentId && audioUpload
			? await verifyBugReportUploadIntent(ctx, {
					intentId: input.audioUploadIntentId,
					actorId: actor.user.id,
					mediaKind: "AUDIO",
					pathname: audioUpload.pathname,
					contentType: audioUpload.contentType,
					size: input.audio.upload.size,
				})
			: null;

	const followUp = await ctx.db.$transaction(async (tx) => {
		if (audioIntent) {
			await consumeBugReportUploadIntent(tx, {
				intentId: audioIntent.id,
				actorId: actor.user.id,
				reportId: report.id,
			});
		}
		const audioDocument = input.audio
			? await createVoiceNoteDocument(tx, {
					actorId: actor.user.id,
					reportId: report.id,
					audio: input.audio,
					title: "Bug report follow-up voice note",
					verifiedUrl: audioIntent?.verifiedStorageUrl,
				})
			: null;

		return tx.bugReportFollowUp.create({
			data: {
				bugReportId: report.id,
				authorId: actor.user.id,
				body: input.body.trim(),
				...getFollowUpAudioData(input.audio, audioDocument?.id),
			},
		});
	});

	return followUp;
}

export async function transcribeBugReportFollowUp(
	ctx: TRPCContext,
	input: z.infer<typeof transcribeBugReportFollowUpSchema>,
) {
	const actor = await requireActor(ctx);
	const followUp = await loadFollowUpForTranscription(ctx, input.followUpId);

	if (!followUp || followUp.bugReport.deletedAt) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Bug report follow-up not found.",
		});
	}

	if (!actor.isSuperAdmin && followUp.bugReport.createdById !== actor.user.id) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "You can only transcribe your own bug report voice notes.",
		});
	}

	return runBugReportFollowUpTranscription(ctx, followUp.id);
}

export async function updateBugReportStatus(
	ctx: TRPCContext,
	input: z.infer<typeof updateBugReportStatusSchema>,
) {
	const actor = await requireSuperAdmin(ctx);
	const existingReport = await ctx.db.bugReport.findFirst({
		where: {
			id: input.bugReportId,
			deletedAt: null,
		},
		select: {
			id: true,
		},
	});

	if (!existingReport) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Bug report not found.",
		});
	}

	const report = await ctx.db.bugReport.update({
		where: {
			id: existingReport.id,
		},
		data: {
			status: input.status,
			statusUpdatedAt: new Date(),
			statusUpdatedById: actor.user.id,
		},
		include: {
			delivery: true,
			_count: {
				select: {
					followUps: true,
				},
			},
		},
	});

	const [hydrated] = await hydrateReports(ctx, [report]);
	return hydrated;
}
