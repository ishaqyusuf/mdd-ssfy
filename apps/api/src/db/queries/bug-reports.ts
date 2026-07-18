import {
	BUG_REPORT_MAX_AUDIO_DURATION_MS,
	BUG_REPORT_MAX_AUDIO_SIZE_BYTES,
	BUG_REPORT_MAX_DURATION_MS,
	BUG_REPORT_MAX_UPLOAD_SIZE_BYTES,
	type addBugReportFollowUpSchema,
	type createBugReportSchema,
	type listBugReportsSchema,
	type transcribeBugReportFollowUpSchema,
	type updateBugReportStatusSchema,
} from "@api/schemas/bug-reports";
import type { TRPCContext } from "@api/trpc/init";
import {
	createBugReportExternalIssue,
	getBugReportIssueConfig,
} from "@api/utils/bug-report-issue";
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
import type { TransactionClient } from "@gnd/db";
import { generatePermissions } from "@gnd/utils/constants";
import { TRPCError } from "@trpc/server";
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
type BugReportForExternalIssue = {
	id: string;
	captureType: BugReportCaptureType;
	description: string | null;
	currentUrl: string | null;
	recordingDocumentId: string | null;
	externalIssueProvider: string | null;
	externalIssueKey: string | null;
	externalIssueStatus: string | null;
	createdById: number;
	followUps: Array<{
		body: string;
		transcriptionText: string | null;
	}>;
};

const BUG_REPORT_VIDEO_DOCUMENT_KIND = "bug_report_recording";
const BUG_REPORT_SCREENSHOT_DOCUMENT_KIND = "bug_report_screenshot";
const BUG_REPORT_AUDIO_DOCUMENT_KIND = "bug_report_voice_note";
const BUG_REPORT_OWNER_TYPE = "bug_report";
const BUG_REPORT_UPLOAD_PREFIX = "bug-reports/";

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

function assertBugReportUpload(input: z.infer<typeof createBugReportSchema>) {
	const pathname = cleanBlobPathname(input.upload.pathname);
	const captureType = input.captureType || "VIDEO";
	const contentType =
		input.upload.contentType ||
		(captureType === "SCREENSHOT" ? "image/png" : "video/webm");

	if (!pathname.startsWith(BUG_REPORT_UPLOAD_PREFIX)) {
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
) {
	if (!audio) return null;

	const pathname = cleanBlobPathname(audio.upload.pathname);
	const contentType = audio.upload.contentType || "audio/webm";

	if (!pathname.startsWith(BUG_REPORT_UPLOAD_PREFIX)) {
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
	},
) {
	const audioUpload = assertBugReportAudioUpload(params.audio);
	if (!audioUpload) return null;

	return tx.storedDocument.create({
		data: {
			kind: BUG_REPORT_AUDIO_DOCUMENT_KIND,
			ownerType: BUG_REPORT_OWNER_TYPE,
			ownerId: params.reportId,
			provider: "vercel-blob",
			pathname: audioUpload.pathname,
			url: params.audio.upload.url,
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
			filename: true,
			mimeType: true,
			meta: true,
		},
	});

	return audioDocument as BugReportAudioDocumentForTranscription | null;
}

async function loadReportForExternalIssue(ctx: TRPCContext, reportId: string) {
	const report = await ctx.db.bugReport.findFirst({
		where: {
			id: reportId,
			deletedAt: null,
		},
		select: {
			id: true,
			captureType: true,
			description: true,
			currentUrl: true,
			recordingDocumentId: true,
			externalIssueProvider: true,
			externalIssueKey: true,
			externalIssueStatus: true,
			createdById: true,
			followUps: {
				where: {
					deletedAt: null,
				},
				orderBy: {
					createdAt: "asc",
				},
				select: {
					body: true,
					transcriptionText: true,
				},
			},
		},
	});

	return report as BugReportForExternalIssue | null;
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
	if (!audioDocument?.url) {
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
		const transcription = await transcribeBugReportAudioDocument({
			url: audioDocument.url,
			filename: audioDocument.filename,
			mimeType: audioDocument.mimeType,
		});
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

async function attemptBugReportFollowUpTranscription(
	ctx: TRPCContext,
	followUpId?: string | null,
) {
	if (!followUpId || !isBugReportTranscriptionConfigured()) return null;

	try {
		return await runBugReportFollowUpTranscription(ctx, followUpId);
	} catch {
		return null;
	}
}

async function attemptBugReportExternalIssueCreation(
	ctx: TRPCContext,
	reportId: string,
) {
	const issueConfig = getBugReportIssueConfig();
	if (!issueConfig) return null;

	const report = await loadReportForExternalIssue(ctx, reportId);
	if (!report || report.externalIssueKey) return null;

	await ctx.db.bugReport.update({
		where: {
			id: report.id,
		},
		data: {
			externalIssueProvider: issueConfig.provider,
			externalIssueStatus: "PENDING",
			externalIssueError: null,
		},
	});

	const [recording, createdBy] = await Promise.all([
		report.recordingDocumentId
			? ctx.db.storedDocument.findFirst({
					where: {
						id: report.recordingDocumentId,
						deletedAt: null,
					},
					select: {
						url: true,
					},
				})
			: null,
		ctx.db.users.findFirst({
			where: {
				id: report.createdById,
			},
			select: {
				name: true,
				email: true,
			},
		}),
	]);
	const transcriptionText =
		report.followUps.find((followUp) => followUp.transcriptionText)
			?.transcriptionText ?? null;
	const bodyText =
		report.description ||
		transcriptionText ||
		report.followUps.find((followUp) => followUp.body)?.body ||
		report.currentUrl ||
		"Bug report";

	try {
		const issue = await createBugReportExternalIssue(
			{
				id: report.id,
				title: bodyText,
				description: report.description || transcriptionText || bodyText,
				currentUrl: report.currentUrl,
				captureType: report.captureType,
				evidenceUrl: recording?.url ?? null,
				transcriptionText,
				createdBy,
			},
			{
				config: issueConfig,
			},
		);

		await ctx.db.bugReport.update({
			where: {
				id: report.id,
			},
			data: {
				externalIssueProvider: issue.provider,
				externalIssueKey: issue.key,
				externalIssueUrl: issue.url,
				externalIssueStatus: "CREATED",
				externalIssueError: null,
				externalIssueCreatedAt: new Date(),
			},
		});

		return issue;
	} catch (error) {
		const message =
			error instanceof Error
				? error.message
				: "Bug report external issue creation failed.";

		await ctx.db.bugReport.update({
			where: {
				id: report.id,
			},
			data: {
				externalIssueProvider: issueConfig.provider,
				externalIssueStatus: "FAILED",
				externalIssueError: message,
			},
		});

		return null;
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
			createdAt: report.createdAt,
			updatedAt: report.updatedAt,
			statusUpdatedAt: report.statusUpdatedAt,
			followUpCount: report._count?.followUps ?? 0,
			recording: recording
				? {
						id: recording.id,
						url: recording.url,
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

export async function createBugReport(
	ctx: TRPCContext,
	input: z.infer<typeof createBugReportSchema>,
) {
	const actor = await requireSubmitAccess(ctx);
	const upload = assertBugReportUpload(input);
	const description = input.description?.trim() || null;

	const { report, followUpId } = await ctx.db.$transaction(async (tx) => {
		const createdReport = await tx.bugReport.create({
			data: {
				createdById: actor.user.id,
				captureType: upload.captureType,
				description,
				currentUrl: input.currentUrl || null,
				userAgent: input.userAgent || null,
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
				url: input.upload.url,
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

		const audio = input.audio;
		let followUpId: string | null = null;
		if (description || audio) {
			const audioDocument = audio
				? await createVoiceNoteDocument(tx, {
						actorId: actor.user.id,
						reportId: createdReport.id,
						audio,
						title: "Initial bug report voice note",
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
	});

	await attemptBugReportFollowUpTranscription(ctx, followUpId);
	await attemptBugReportExternalIssueCreation(ctx, report.id);

	const refreshedReport = await ctx.db.bugReport.findFirst({
		where: {
			id: report.id,
			deletedAt: null,
		},
		include: {
			_count: {
				select: {
					followUps: true,
				},
			},
		},
	});
	const [hydrated] = await hydrateReports(ctx, [refreshedReport ?? report]);
	return hydrated;
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
			const audio = followUp.audioDocumentId
				? (audioDocumentById.get(followUp.audioDocumentId) ?? null)
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

	const followUp = await ctx.db.$transaction(async (tx) => {
		const audioDocument = input.audio
			? await createVoiceNoteDocument(tx, {
					actorId: actor.user.id,
					reportId: report.id,
					audio: input.audio,
					title: "Bug report follow-up voice note",
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

	await attemptBugReportFollowUpTranscription(ctx, followUp.id);

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
