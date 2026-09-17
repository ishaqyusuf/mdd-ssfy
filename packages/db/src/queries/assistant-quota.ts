import { type Database, Prisma, type TransactionClient } from "..";

const ACTIVE_RESERVATION_STATUSES = ["reserved"] as const;
const COUNTED_RESERVATION_STATUSES = ["reserved", "settled"] as const;
const DEFAULT_TOKEN_RESERVATION = 16_000;
const RESERVATION_LEASE_MS = 2 * 60 * 1000;

export type AssistantQuotaDimension =
	| "daily_requests"
	| "monthly_requests"
	| "daily_tokens"
	| "monthly_tokens"
	| "daily_cost"
	| "monthly_cost"
	| "concurrent_runs";

export class AssistantQuotaExceededError extends Error {
	readonly code = "ASSISTANT_QUOTA_EXCEEDED";

	constructor(
		readonly dimension: AssistantQuotaDimension,
		readonly limit: number,
		readonly remaining: number,
		readonly resetAt: Date,
	) {
		super("Assistant quota reached");
		this.name = "AssistantQuotaExceededError";
	}
}

export class AssistantQuotaUnavailableError extends Error {
	readonly code = "ASSISTANT_QUOTA_UNAVAILABLE";

	constructor() {
		super("Assistant quota could not be evaluated");
		this.name = "AssistantQuotaUnavailableError";
	}
}

function safeTimeZone(timezone: string) {
	try {
		new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format();
		return timezone;
	} catch {
		return "UTC";
	}
}

function timeZoneParts(date: Date, timezone: string) {
	const parts = new Intl.DateTimeFormat("en-US", {
		timeZone: timezone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: false,
	}).formatToParts(date);
	const value = (type: Intl.DateTimeFormatPartTypes) =>
		Number(parts.find((part) => part.type === type)?.value || 0);
	return {
		year: value("year"),
		month: value("month"),
		day: value("day"),
		hour: value("hour") === 24 ? 0 : value("hour"),
		minute: value("minute"),
		second: value("second"),
	};
}

function zonedTimeToUtc(
	input: { year: number; month: number; day: number },
	timezone: string,
) {
	const nominal = new Date(Date.UTC(input.year, input.month - 1, input.day));
	const represented = timeZoneParts(nominal, timezone);
	const offset =
		Date.UTC(
			represented.year,
			represented.month - 1,
			represented.day,
			represented.hour,
			represented.minute,
			represented.second,
		) - nominal.getTime();
	let resolved = new Date(nominal.getTime() - offset);
	const resolvedParts = timeZoneParts(resolved, timezone);
	const resolvedOffset =
		Date.UTC(
			resolvedParts.year,
			resolvedParts.month - 1,
			resolvedParts.day,
			resolvedParts.hour,
			resolvedParts.minute,
			resolvedParts.second,
		) - resolved.getTime();
	if (resolvedOffset !== offset)
		resolved = new Date(nominal.getTime() - resolvedOffset);
	return resolved;
}

export function resolveAssistantQuotaWindows(now: Date, rawTimezone: string) {
	const timezone = safeTimeZone(rawTimezone);
	const local = timeZoneParts(now, timezone);
	const nextDay = new Date(
		Date.UTC(local.year, local.month - 1, local.day + 1),
	);
	const nextMonth = new Date(Date.UTC(local.year, local.month, 1));
	return {
		timezone,
		dayStart: zonedTimeToUtc(
			{ year: local.year, month: local.month, day: local.day },
			timezone,
		),
		dayEnd: zonedTimeToUtc(
			{
				year: nextDay.getUTCFullYear(),
				month: nextDay.getUTCMonth() + 1,
				day: nextDay.getUTCDate(),
			},
			timezone,
		),
		monthStart: zonedTimeToUtc(
			{ year: local.year, month: local.month, day: 1 },
			timezone,
		),
		monthEnd: zonedTimeToUtc(
			{
				year: nextMonth.getUTCFullYear(),
				month: nextMonth.getUTCMonth() + 1,
				day: 1,
			},
			timezone,
		),
	};
}

type QuotaPolicy = {
	id: string;
	name: string;
	kind: string;
	dailyRequestLimit: number | null;
	monthlyRequestLimit: number | null;
	dailyTokenLimit: bigint | null;
	monthlyTokenLimit: bigint | null;
	concurrentRunLimit: number | null;
	dailyCostLimitMicros: bigint | null;
	monthlyCostLimitMicros: bigint | null;
	warningPercent: number;
	timezone: string;
	enforcementMode: string;
	effectiveFrom: Date;
	effectiveTo: Date | null;
	version: number;
};

type QuotaReservation = {
	status: string;
	requestUnits: number;
	reservedTokens: bigint;
	reservedCostMicros: bigint;
	actualTokens: bigint | null;
	actualCostMicros: bigint | null;
	dayWindowStart: Date;
	monthWindowStart: Date;
	expiresAt: Date;
};

function toSafeNumber(value: bigint | number | null) {
	if (value == null) return null;
	const normalized = typeof value === "bigint" ? value : BigInt(value);
	return Number(
		normalized > BigInt(Number.MAX_SAFE_INTEGER)
			? BigInt(Number.MAX_SAFE_INTEGER)
			: normalized,
	);
}

function consumedAmount(
	reservation: QuotaReservation,
	field: "tokens" | "cost",
) {
	if (reservation.status === "settled") {
		return field === "tokens"
			? (reservation.actualTokens ?? reservation.reservedTokens)
			: (reservation.actualCostMicros ?? reservation.reservedCostMicros);
	}
	return field === "tokens"
		? reservation.reservedTokens
		: reservation.reservedCostMicros;
}

export function evaluateAssistantQuotaUsage(input: {
	policy: QuotaPolicy | null;
	reservations: QuotaReservation[];
	now: Date;
	reserveRequests?: number;
	reserveTokens?: bigint;
	reserveCostMicros?: bigint;
}) {
	const policy = input.policy;
	if (!policy) {
		return {
			configured: false as const,
			policyId: null,
			policyName: null,
			enforcementMode: "none" as const,
			warning: false,
			exceeded: false,
			exceededDimension: null,
			resetAt: null,
			limits: {
				dailyRequests: null,
				monthlyRequests: null,
				dailyTokens: null,
				monthlyTokens: null,
				concurrentRuns: null,
				dailyCostMicros: null,
				monthlyCostMicros: null,
			},
			used: {
				dailyRequests: 0,
				monthlyRequests: 0,
				dailyTokens: 0,
				monthlyTokens: 0,
				concurrentRuns: 0,
				dailyCostMicros: 0,
				monthlyCostMicros: 0,
			},
			remaining: { requests: null, tokens: null, concurrentRuns: null },
		};
	}
	const windows = resolveAssistantQuotaWindows(input.now, policy.timezone);
	const counted = input.reservations.filter(
		(reservation) =>
			COUNTED_RESERVATION_STATUSES.includes(
				reservation.status as (typeof COUNTED_RESERVATION_STATUSES)[number],
			) &&
			(reservation.status !== "reserved" || reservation.expiresAt > input.now),
	);
	const daily = counted.filter(
		(reservation) =>
			reservation.dayWindowStart.getTime() === windows.dayStart.getTime(),
	);
	const monthly = counted.filter(
		(reservation) =>
			reservation.monthWindowStart.getTime() === windows.monthStart.getTime(),
	);
	const sumRequests = (rows: QuotaReservation[]) =>
		rows.reduce((sum, row) => sum + row.requestUnits, 0);
	const sum = (rows: QuotaReservation[], field: "tokens" | "cost") =>
		rows.reduce((total, row) => total + consumedAmount(row, field), 0n);
	const used = {
		dailyRequests: sumRequests(daily) + (input.reserveRequests ?? 0),
		monthlyRequests: sumRequests(monthly) + (input.reserveRequests ?? 0),
		dailyTokens: sum(daily, "tokens") + (input.reserveTokens ?? 0n),
		monthlyTokens: sum(monthly, "tokens") + (input.reserveTokens ?? 0n),
		concurrentRuns:
			counted.filter(
				(row) =>
					ACTIVE_RESERVATION_STATUSES.includes(
						row.status as (typeof ACTIVE_RESERVATION_STATUSES)[number],
					) && row.expiresAt > input.now,
			).length + (input.reserveRequests ?? 0),
		dailyCostMicros: sum(daily, "cost") + (input.reserveCostMicros ?? 0n),
		monthlyCostMicros: sum(monthly, "cost") + (input.reserveCostMicros ?? 0n),
	};
	const dimensions: Array<{
		dimension: AssistantQuotaDimension;
		used: bigint;
		limit: bigint | null;
		resetAt: Date;
	}> = [
		{
			dimension: "daily_requests",
			used: BigInt(used.dailyRequests),
			limit:
				policy.dailyRequestLimit == null
					? null
					: BigInt(policy.dailyRequestLimit),
			resetAt: windows.dayEnd,
		},
		{
			dimension: "monthly_requests",
			used: BigInt(used.monthlyRequests),
			limit:
				policy.monthlyRequestLimit == null
					? null
					: BigInt(policy.monthlyRequestLimit),
			resetAt: windows.monthEnd,
		},
		{
			dimension: "daily_tokens",
			used: used.dailyTokens,
			limit: policy.dailyTokenLimit,
			resetAt: windows.dayEnd,
		},
		{
			dimension: "monthly_tokens",
			used: used.monthlyTokens,
			limit: policy.monthlyTokenLimit,
			resetAt: windows.monthEnd,
		},
		{
			dimension: "daily_cost",
			used: used.dailyCostMicros,
			limit: policy.dailyCostLimitMicros,
			resetAt: windows.dayEnd,
		},
		{
			dimension: "monthly_cost",
			used: used.monthlyCostMicros,
			limit: policy.monthlyCostLimitMicros,
			resetAt: windows.monthEnd,
		},
		{
			dimension: "concurrent_runs",
			used: BigInt(used.concurrentRuns),
			limit:
				policy.concurrentRunLimit == null
					? null
					: BigInt(policy.concurrentRunLimit),
			resetAt: new Date(input.now.getTime() + RESERVATION_LEASE_MS),
		},
	];
	const exceeded = dimensions.find(
		(dimension) => dimension.limit != null && dimension.used > dimension.limit,
	);
	const warning = dimensions.some(
		(dimension) =>
			dimension.limit != null &&
			dimension.limit > 0n &&
			dimension.used * 100n >= dimension.limit * BigInt(policy.warningPercent),
	);
	const remainingValue = (
		entries: Array<{ used: bigint; limit: bigint | null }>,
	) => {
		const values = entries.flatMap(({ used: consumed, limit }) =>
			limit == null ? [] : [limit > consumed ? limit - consumed : 0n],
		);
		return values.length
			? toSafeNumber(values.reduce((a, b) => (a < b ? a : b)))
			: null;
	};
	return {
		configured: true as const,
		policyId: policy.id,
		policyName: policy.name,
		enforcementMode: policy.enforcementMode,
		warning,
		exceeded: Boolean(exceeded),
		exceededDimension: exceeded?.dimension ?? null,
		resetAt: exceeded?.resetAt ?? windows.dayEnd,
		limits: {
			dailyRequests: policy.dailyRequestLimit,
			monthlyRequests: policy.monthlyRequestLimit,
			dailyTokens: toSafeNumber(policy.dailyTokenLimit),
			monthlyTokens: toSafeNumber(policy.monthlyTokenLimit),
			concurrentRuns: policy.concurrentRunLimit,
			dailyCostMicros: toSafeNumber(policy.dailyCostLimitMicros),
			monthlyCostMicros: toSafeNumber(policy.monthlyCostLimitMicros),
		},
		used: {
			dailyRequests: used.dailyRequests,
			monthlyRequests: used.monthlyRequests,
			dailyTokens: toSafeNumber(used.dailyTokens) ?? 0,
			monthlyTokens: toSafeNumber(used.monthlyTokens) ?? 0,
			concurrentRuns: used.concurrentRuns,
			dailyCostMicros: toSafeNumber(used.dailyCostMicros) ?? 0,
			monthlyCostMicros: toSafeNumber(used.monthlyCostMicros) ?? 0,
		},
		remaining: {
			requests: remainingValue(dimensions.slice(0, 2)),
			tokens: remainingValue(dimensions.slice(2, 4)),
			concurrentRuns: remainingValue(dimensions.slice(6, 7)),
		},
	};
}

async function runQuotaTransaction<T>(
	db: Database,
	operation: (tx: TransactionClient) => Promise<T>,
) {
	for (let attempt = 0; ; attempt += 1) {
		try {
			return await db.$transaction(operation, {
				isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
			});
		} catch (error) {
			if (
				attempt >= 9 ||
				!(error instanceof Prisma.PrismaClientKnownRequestError) ||
				!["P2002", "P2034"].includes(error.code)
			) {
				throw error;
			}
			await new Promise((resolve) =>
				setTimeout(resolve, Math.min(15 * 2 ** attempt, 250)),
			);
		}
	}
}

async function activePolicy(
	db: Database | TransactionClient,
	actorUserId: number,
	now: Date,
) {
	return db.assistantQuotaPolicy.findFirst({
		where: {
			userId: actorUserId,
			effectiveFrom: { lte: now },
			OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }],
		},
		orderBy: [{ effectiveFrom: "desc" }, { createdAt: "desc" }],
	});
}

async function quotaReservations(
	db: Database | TransactionClient,
	actorUserId: number,
	monthStart: Date,
) {
	return db.assistantQuotaReservation.findMany({
		where: {
			actorUserId,
			monthWindowStart: monthStart,
			status: { in: [...COUNTED_RESERVATION_STATUSES] },
		},
		select: {
			status: true,
			requestUnits: true,
			reservedTokens: true,
			reservedCostMicros: true,
			actualTokens: true,
			actualCostMicros: true,
			dayWindowStart: true,
			monthWindowStart: true,
			expiresAt: true,
		},
	});
}

export async function getAssistantQuotaStatus(
	db: Database,
	input: { actorUserId: number; now?: Date },
) {
	const now = input.now ?? new Date();
	const policy = await activePolicy(db, input.actorUserId, now);
	if (!policy)
		return evaluateAssistantQuotaUsage({ policy: null, reservations: [], now });
	const windows = resolveAssistantQuotaWindows(now, policy.timezone);
	const reservations = await quotaReservations(
		db,
		input.actorUserId,
		windows.monthStart,
	);
	return evaluateAssistantQuotaUsage({ policy, reservations, now });
}

async function reservedCostForPolicy(
	tx: TransactionClient,
	policy: QuotaPolicy,
	modelIdentity: string,
	reservedTokens: bigint,
	now: Date,
) {
	if (
		policy.dailyCostLimitMicros == null &&
		policy.monthlyCostLimitMicros == null
	)
		return 0n;
	const [provider, model] = modelIdentity.split(":", 2);
	if (!provider || !model) throw new AssistantQuotaUnavailableError();
	const price = await tx.assistantModelPrice.findFirst({
		where: {
			provider,
			model,
			effectiveFrom: { lte: now },
			OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }],
		},
		orderBy: { effectiveFrom: "desc" },
	});
	if (!price) throw new AssistantQuotaUnavailableError();
	const rate = [
		price.inputPerMillionMicros,
		price.cachedPerMillionMicros,
		price.outputPerMillionMicros,
		price.reasoningPerMillionMicros,
	].reduce((highest, candidate) => (candidate > highest ? candidate : highest));
	return (reservedTokens * rate + 999_999n) / 1_000_000n;
}

function policySnapshot(policy: QuotaPolicy) {
	return {
		id: policy.id,
		name: policy.name,
		kind: policy.kind,
		version: policy.version,
		timezone: policy.timezone,
		enforcementMode: policy.enforcementMode,
		warningPercent: policy.warningPercent,
		dailyRequestLimit: policy.dailyRequestLimit,
		monthlyRequestLimit: policy.monthlyRequestLimit,
		dailyTokenLimit: policy.dailyTokenLimit?.toString() ?? null,
		monthlyTokenLimit: policy.monthlyTokenLimit?.toString() ?? null,
		concurrentRunLimit: policy.concurrentRunLimit,
		dailyCostLimitMicros: policy.dailyCostLimitMicros?.toString() ?? null,
		monthlyCostLimitMicros: policy.monthlyCostLimitMicros?.toString() ?? null,
		effectiveFrom: policy.effectiveFrom.toISOString(),
		effectiveTo: policy.effectiveTo?.toISOString() ?? null,
	};
}

export async function reserveAssistantQuota(
	db: Database,
	input: {
		runId: string;
		actorUserId: number;
		scopeType: string;
		scopeId: string;
		modelIdentity: string;
		reservedTokens?: number;
		now?: Date;
	},
) {
	const now = input.now ?? new Date();
	return runQuotaTransaction(db, async (tx) => {
		const existing = await tx.assistantQuotaReservation.findUnique({
			where: { runId: input.runId },
		});
		if (existing) return existing;
		await tx.assistantQuotaReservation.updateMany({
			where: {
				actorUserId: input.actorUserId,
				status: "reserved",
				expiresAt: { lte: now },
			},
			data: { status: "expired", settledAt: now },
		});
		const policy = await activePolicy(tx, input.actorUserId, now);
		if (!policy) return null;
		const windows = resolveAssistantQuotaWindows(now, policy.timezone);
		const reservations = await quotaReservations(
			tx,
			input.actorUserId,
			windows.monthStart,
		);
		const reservedTokens = BigInt(
			Math.max(1, input.reservedTokens ?? DEFAULT_TOKEN_RESERVATION),
		);
		const reservedCostMicros = await reservedCostForPolicy(
			tx,
			policy,
			input.modelIdentity,
			reservedTokens,
			now,
		);
		const projected = evaluateAssistantQuotaUsage({
			policy,
			reservations,
			now,
			reserveRequests: 1,
			reserveTokens: reservedTokens,
			reserveCostMicros: reservedCostMicros,
		});
		if (projected.exceeded && policy.enforcementMode === "hard") {
			const dimension = projected.exceededDimension;
			if (!dimension) throw new AssistantQuotaUnavailableError();
			const limit =
				dimension === "daily_requests"
					? policy.dailyRequestLimit
					: dimension === "monthly_requests"
						? policy.monthlyRequestLimit
						: dimension === "daily_tokens"
							? toSafeNumber(policy.dailyTokenLimit)
							: dimension === "monthly_tokens"
								? toSafeNumber(policy.monthlyTokenLimit)
								: dimension === "daily_cost"
									? toSafeNumber(policy.dailyCostLimitMicros)
									: dimension === "monthly_cost"
										? toSafeNumber(policy.monthlyCostLimitMicros)
										: policy.concurrentRunLimit;
			throw new AssistantQuotaExceededError(
				dimension,
				limit ?? 0,
				0,
				projected.resetAt ?? windows.dayEnd,
			);
		}
		return tx.assistantQuotaReservation.create({
			data: {
				runId: input.runId,
				actorUserId: input.actorUserId,
				scopeType: input.scopeType,
				scopeId: input.scopeId,
				policyId: policy.id,
				policySnapshot: policySnapshot(policy),
				requestUnits: 1,
				reservedTokens,
				reservedCostMicros,
				dayWindowStart: windows.dayStart,
				monthWindowStart: windows.monthStart,
				expiresAt: new Date(now.getTime() + RESERVATION_LEASE_MS),
			},
		});
	});
}

export function settleAssistantQuotaReservationFallback(
	db: Database,
	input: { runId: string; release?: boolean; now?: Date },
) {
	const now = input.now ?? new Date();
	return db.assistantQuotaReservation.updateMany({
		where: { runId: input.runId, status: "reserved" },
		data: input.release
			? {
					status: "released",
					actualTokens: 0n,
					actualCostMicros: 0n,
					settledAt: now,
				}
			: { status: "settled", settledAt: now },
	});
}

export type AssistantUserQuotaPolicyInput = {
	userId: number;
	name: string;
	sourceTemplateId?: string | null;
	dailyRequestLimit?: number | null;
	monthlyRequestLimit?: number | null;
	dailyTokenLimit?: number | null;
	monthlyTokenLimit?: number | null;
	concurrentRunLimit?: number | null;
	dailyCostLimitMicros?: number | null;
	monthlyCostLimitMicros?: number | null;
	warningPercent: number;
	timezone: string;
	enforcementMode: "hard" | "warning" | "dry_run";
	effectiveFrom: Date;
	effectiveTo?: Date | null;
};

export async function setAssistantUserQuotaPolicy(
	db: Database,
	actorUserId: number,
	input: AssistantUserQuotaPolicyInput,
) {
	return runQuotaTransaction(db, async (tx) => {
		const user = await tx.users.findFirst({
			where: { id: input.userId, deletedAt: null, accessRevokedAt: null },
			select: { id: true },
		});
		if (!user) throw new Error("Assistant quota target is unavailable");
		if (input.effectiveTo && input.effectiveTo <= input.effectiveFrom)
			throw new Error("Assistant quota expiry must follow its start");
		await tx.assistantQuotaPolicy.updateMany({
			where: {
				userId: input.userId,
				effectiveFrom: { lte: input.effectiveFrom },
				OR: [
					{ effectiveTo: null },
					{ effectiveTo: { gt: input.effectiveFrom } },
				],
			},
			data: { effectiveTo: input.effectiveFrom, updatedByUserId: actorUserId },
		});
		return tx.assistantQuotaPolicy.create({
			data: {
				userId: input.userId,
				name: input.name,
				kind: input.effectiveTo ? "temporary_override" : "user",
				sourceTemplateId: input.sourceTemplateId ?? null,
				dailyRequestLimit: input.dailyRequestLimit ?? null,
				monthlyRequestLimit: input.monthlyRequestLimit ?? null,
				dailyTokenLimit:
					input.dailyTokenLimit == null ? null : BigInt(input.dailyTokenLimit),
				monthlyTokenLimit:
					input.monthlyTokenLimit == null
						? null
						: BigInt(input.monthlyTokenLimit),
				concurrentRunLimit: input.concurrentRunLimit ?? null,
				dailyCostLimitMicros:
					input.dailyCostLimitMicros == null
						? null
						: BigInt(input.dailyCostLimitMicros),
				monthlyCostLimitMicros:
					input.monthlyCostLimitMicros == null
						? null
						: BigInt(input.monthlyCostLimitMicros),
				warningPercent: input.warningPercent,
				timezone: safeTimeZone(input.timezone),
				enforcementMode: input.enforcementMode,
				effectiveFrom: input.effectiveFrom,
				effectiveTo: input.effectiveTo ?? null,
				createdByUserId: actorUserId,
				updatedByUserId: actorUserId,
			},
		});
	});
}

export function listAssistantQuotaPolicies(
	db: Database,
	input: { userId?: number; take: number },
) {
	return db.assistantQuotaPolicy.findMany({
		where: input.userId ? { userId: input.userId } : { userId: { not: null } },
		orderBy: [{ effectiveFrom: "desc" }, { createdAt: "desc" }],
		take: input.take,
	});
}
