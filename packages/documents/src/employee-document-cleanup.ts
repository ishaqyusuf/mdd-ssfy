import {
	EMPLOYEE_DOCUMENT_KIND,
	EMPLOYEE_DOCUMENT_OWNER_TYPE,
	EMPLOYEE_DOCUMENT_PRIVATE_ACCESS,
	isPrivateEmployeeDocumentMeta,
	parseEmployeeStoredDocumentId,
} from "./employee-document";

export const EMPLOYEE_DOCUMENT_CLEANUP_MIN_AGE_MS = 10 * 60 * 1000;
export const EMPLOYEE_DOCUMENT_CLEANUP_LEASE_MS = 15 * 60 * 1000;
export const EMPLOYEE_DOCUMENT_CLEANUP_MAX_ATTEMPTS = 5;

type CleanupStoredRecord = {
	id: string;
	ownerType: string;
	ownerId: string;
	kind: string;
	provider: string;
	visibility: string;
	status: string;
	isCurrent: boolean;
	deletedAt: Date | null;
	pathname: string;
	meta: unknown;
};

type CleanupBusinessLink = {
	id: number;
	userId: number;
	deletedAt: Date | null;
	meta: unknown;
};

function metadataObject(value: unknown): Record<string, unknown> | null {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

function positiveInteger(value: unknown) {
	return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

export function isSafeEmployeeCleanupPathname(input: {
	pathname: string;
	ownerId: string;
	businessDocumentId: number;
}) {
	const { pathname, ownerId, businessDocumentId } = input;
	if (
		!pathname ||
		pathname.length > 512 ||
		!/^\d+$/.test(ownerId) ||
		!positiveInteger(businessDocumentId) ||
		pathname.startsWith("/") ||
		pathname.includes("\\") ||
		/[?#]/.test(pathname) ||
		pathname.includes("//") ||
		/(?:^|\/)\.\.?($|\/)/.test(pathname) ||
		/%(?:2e|2f|5c)/i.test(pathname)
	) {
		return false;
	}
	return (
		(pathname.startsWith(`user/${ownerId}/attachment/`) &&
			pathname.length > `user/${ownerId}/attachment/`.length) ||
		(pathname.startsWith(
			`employee-documents/${ownerId}/${businessDocumentId}/`,
		) &&
			pathname.length >
				`employee-documents/${ownerId}/${businessDocumentId}/`.length)
	);
}

export function inspectPrivateEmployeeCleanup(input: {
	stored: CleanupStoredRecord | null;
	deletedLinks: CleanupBusinessLink[];
	liveLinks: CleanupBusinessLink[];
	now: Date;
	allowClaimId?: string;
}) {
	const { stored, deletedLinks, liveLinks, now } = input;
	if (!stored) return { ok: false as const, reason: "missing_record" as const };
	const meta = metadataObject(stored.meta);
	if (
		stored.ownerType !== EMPLOYEE_DOCUMENT_OWNER_TYPE ||
		stored.kind !== EMPLOYEE_DOCUMENT_KIND ||
		stored.provider !== "vercel-blob" ||
		stored.visibility !== EMPLOYEE_DOCUMENT_PRIVATE_ACCESS ||
		stored.status !== "deleted" ||
		stored.isCurrent ||
		!stored.deletedAt ||
		!isPrivateEmployeeDocumentMeta(meta) ||
		meta?.cleanupStatus !== "retry_required"
	) {
		return { ok: false as const, reason: "invalid_record" as const };
	}
	if (deletedLinks.length !== 1 || liveLinks.length !== 0) {
		return { ok: false as const, reason: "ambiguous_link" as const };
	}
	const link = deletedLinks[0];
	if (
		!link ||
		!link.deletedAt ||
		!positiveInteger(link.id) ||
		!positiveInteger(link.userId) ||
		String(link.userId) !== stored.ownerId ||
		parseEmployeeStoredDocumentId(link.meta) !== stored.id
	) {
		return { ok: false as const, reason: "mismatched_link" as const };
	}
	if (
		!isSafeEmployeeCleanupPathname({
			pathname: stored.pathname,
			ownerId: stored.ownerId,
			businessDocumentId: link.id,
		})
	) {
		return { ok: false as const, reason: "unsafe_path" as const };
	}
	const retryAt =
		typeof meta.cleanupUpdatedAt === "string"
			? Date.parse(meta.cleanupUpdatedAt)
			: Number.NaN;
	if (
		!Number.isFinite(retryAt) ||
		retryAt > now.getTime() ||
		now.getTime() - retryAt < EMPLOYEE_DOCUMENT_CLEANUP_MIN_AGE_MS
	) {
		return { ok: false as const, reason: "retry_not_mature" as const };
	}
	const claim = metadataObject(meta.cleanupClaim);
	const ownsClaim = Boolean(
		input.allowClaimId && claim?.id === input.allowClaimId,
	);
	const attempts = meta.cleanupAttemptCount ?? 0;
	if (
		!Number.isSafeInteger(attempts) ||
		(attempts as number) < 0 ||
		((attempts as number) >= EMPLOYEE_DOCUMENT_CLEANUP_MAX_ATTEMPTS &&
			!ownsClaim)
	) {
		return { ok: false as const, reason: "attempt_limit" as const };
	}
	if (claim) {
		if (ownsClaim) {
			const expiresAt =
				typeof claim.expiresAt === "string"
					? Date.parse(claim.expiresAt)
					: Number.NaN;
			if (!Number.isFinite(expiresAt) || expiresAt <= now.getTime()) {
				return { ok: false as const, reason: "claim_expired" as const };
			}
			return {
				ok: true as const,
				businessDocumentId: link.id,
				meta,
				attempts: attempts as number,
				pathname: stored.pathname,
			};
		}
		const expiresAt =
			typeof claim.expiresAt === "string"
				? Date.parse(claim.expiresAt)
				: Number.NaN;
		if (!Number.isFinite(expiresAt) || expiresAt > now.getTime()) {
			return { ok: false as const, reason: "claim_active_or_invalid" as const };
		}
	}
	return {
		ok: true as const,
		businessDocumentId: link.id,
		meta,
		attempts: attempts as number,
		pathname: stored.pathname,
	};
}

export function createEmployeeCleanupClaimMeta(input: {
	meta: Record<string, unknown>;
	claimId: string;
	attempts: number;
	now: Date;
}) {
	return {
		...input.meta,
		cleanupAttemptCount: input.attempts + 1,
		cleanupClaim: {
			id: input.claimId,
			expiresAt: new Date(
				input.now.getTime() + EMPLOYEE_DOCUMENT_CLEANUP_LEASE_MS,
			).toISOString(),
		},
	};
}

export function ownsEmployeeCleanupClaim(meta: unknown, claimId: string) {
	const claim = metadataObject(metadataObject(meta)?.cleanupClaim);
	return claim?.id === claimId;
}

export function finishEmployeeCleanupMeta(input: {
	meta: Record<string, unknown>;
	completed: boolean;
	now: Date;
}) {
	const { cleanupClaim: _discard, ...remaining } = input.meta;
	return {
		...remaining,
		cleanupStatus: input.completed ? "completed" : "retry_required",
		cleanupUpdatedAt: input.completed
			? input.now.toISOString()
			: remaining.cleanupUpdatedAt,
	};
}
