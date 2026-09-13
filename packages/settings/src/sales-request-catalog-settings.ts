import { type Db, Prisma } from "@gnd/db";
import { z } from "zod";

const SALES_SETTINGS_TYPE = "sales-settings";
const SETTINGS_TRANSACTION_TIMEOUT_MS = 60_000;

const componentUidSchema = z.string().trim().min(1).max(191);

export const salesRequestCatalogPolicySchema = z
	.object({
		gracePeriodDays: z.number().int().min(0).max(3650).default(90),
		pinnedComponentUids: z.array(componentUidSchema).max(2_000).default([]),
		excludedComponentUids: z.array(componentUidSchema).max(2_000).default([]),
	})
	.strict()
	.transform((value) => ({
		gracePeriodDays: value.gracePeriodDays,
		pinnedComponentUids: [...new Set(value.pinnedComponentUids)].sort(),
		excludedComponentUids: [...new Set(value.excludedComponentUids)].sort(),
	}));

export type SalesRequestCatalogPolicy = z.infer<
	typeof salesRequestCatalogPolicySchema
>;

export type SalesRequestCatalogPublication = {
	generation: number;
	requestedAt?: string;
	requestedBy?: number;
	publishedRevision?: string;
	status: "failed" | "pending" | "published" | "stale";
	counts?: Record<string, number>;
	error?: string;
};

export type SalesRequestCatalogSettings = {
	settingId: number;
	policy: SalesRequestCatalogPolicy;
	publication: SalesRequestCatalogPublication;
};

export function isSalesRequestCatalogPublicationCurrent(
	publication: Pick<
		SalesRequestCatalogPublication,
		"publishedRevision" | "status"
	>,
	configurationRevision: string,
) {
	return (
		publication.status === "published" &&
		publication.publishedRevision === configurationRevision
	);
}

type RecordValue = Record<string, unknown>;

function isRecord(value: unknown): value is RecordValue {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

function strictRecord(value: unknown, label: string): RecordValue {
	if (value == null) return {};
	if (typeof value === "string") {
		try {
			return strictRecord(JSON.parse(value), label);
		} catch {
			throw new Error(`Invalid sales settings ${label}`);
		}
	}
	if (!isRecord(value)) throw new Error(`Invalid sales settings ${label}`);
	return value;
}

function requireSettingId(value: unknown): asserts value is number {
	if (!Number.isSafeInteger(value) || (value as number) <= 0) {
		throw new Error("A valid sales settings ID is required");
	}
}

function parsePublication(value: unknown): SalesRequestCatalogPublication {
	if (!isRecord(value)) return { generation: 0, status: "stale" };
	const generation = Number.isSafeInteger(value.generation)
		? Math.max(0, value.generation as number)
		: 0;
	const status = ["failed", "pending", "published", "stale"].includes(
		String(value.status),
	)
		? (value.status as SalesRequestCatalogPublication["status"])
		: "stale";
	const counts = isRecord(value.counts)
		? Object.fromEntries(
				Object.entries(value.counts).filter(
					(entry): entry is [string, number] =>
						typeof entry[1] === "number" && Number.isFinite(entry[1]),
				),
			)
		: undefined;
	return {
		generation,
		status,
		...(typeof value.requestedAt === "string"
			? { requestedAt: value.requestedAt }
			: {}),
		...(Number.isSafeInteger(value.requestedBy)
			? { requestedBy: value.requestedBy as number }
			: {}),
		...(typeof value.publishedRevision === "string"
			? { publishedRevision: value.publishedRevision }
			: {}),
		...(counts ? { counts } : {}),
		...(typeof value.error === "string" ? { error: value.error } : {}),
	};
}

function readCatalog(
	meta: unknown,
): Omit<SalesRequestCatalogSettings, "settingId"> {
	const settings = strictRecord(meta, "metadata");
	const requestGeneration = strictRecord(
		settings.requestGeneration,
		"requestGeneration",
	);
	const parsedPolicy = salesRequestCatalogPolicySchema.safeParse(
		requestGeneration.catalogPolicy,
	);
	return {
		policy: parsedPolicy.success
			? parsedPolicy.data
			: salesRequestCatalogPolicySchema.parse({}),
		publication: parsePublication(requestGeneration.catalogPublication),
	};
}

export async function getSalesRequestCatalogSettings(
	db: Pick<Db, "settings">,
	settingId: number,
): Promise<SalesRequestCatalogSettings> {
	requireSettingId(settingId);
	const setting = await db.settings.findFirst({
		where: { id: settingId, type: SALES_SETTINGS_TYPE, deletedAt: null },
		select: { id: true, meta: true },
	});
	if (!setting) throw new Error(`Sales settings not found: ${settingId}`);
	return { settingId, ...readCatalog(setting.meta) };
}

async function lockedCatalogUpdate<T>(
	db: Db,
	settingId: number,
	update: (catalog: Omit<SalesRequestCatalogSettings, "settingId">) => {
		catalog: Omit<SalesRequestCatalogSettings, "settingId">;
		result: T;
	},
): Promise<T> {
	requireSettingId(settingId);
	return db.$transaction(
		async (tx) => {
			const locked = await tx.$queryRaw<Array<{ id: number }>>(
				Prisma.sql`SELECT id FROM Settings WHERE id=${settingId} AND type=${SALES_SETTINGS_TYPE} AND deletedAt IS NULL FOR UPDATE`,
			);
			if (!locked.some((row) => row.id === settingId)) {
				throw new Error(`Sales settings not found: ${settingId}`);
			}
			const setting = await tx.settings.findFirst({
				where: { id: settingId, type: SALES_SETTINGS_TYPE, deletedAt: null },
				select: { id: true, meta: true },
			});
			if (!setting) throw new Error(`Sales settings not found: ${settingId}`);
			const settings = { ...strictRecord(setting.meta, "metadata") };
			const requestGeneration = {
				...strictRecord(settings.requestGeneration, "requestGeneration"),
			};
			const next = update(readCatalog(settings));
			requestGeneration.catalogPolicy = next.catalog.policy;
			requestGeneration.catalogPublication = next.catalog.publication;
			settings.requestGeneration = requestGeneration;
			await tx.settings.update({
				where: { id: settingId },
				data: { meta: settings },
			});
			return next.result;
		},
		{
			isolationLevel: "Serializable",
			timeout: SETTINGS_TRANSACTION_TIMEOUT_MS,
		},
	);
}

export function updateSalesRequestCatalogPolicy(
	db: Db,
	input: { settingId: number; policy: SalesRequestCatalogPolicy },
) {
	const policy = salesRequestCatalogPolicySchema.parse(input.policy);
	return lockedCatalogUpdate(db, input.settingId, (current) => {
		const catalog = {
			policy,
			publication: { ...current.publication, status: "stale" as const },
		};
		return { catalog, result: { settingId: input.settingId, ...catalog } };
	});
}

export function beginSalesRequestCatalogRegeneration(
	db: Db,
	input: { settingId: number; requestedBy: number; requestedAt?: Date },
) {
	return lockedCatalogUpdate(db, input.settingId, (current) => {
		const { error: _ignoredError, ...publicationWithoutError } =
			current.publication;
		const publication: SalesRequestCatalogPublication = {
			...publicationWithoutError,
			generation: current.publication.generation + 1,
			requestedAt: (input.requestedAt ?? new Date()).toISOString(),
			requestedBy: input.requestedBy,
			status: "pending",
		};
		const catalog = { ...current, publication };
		return { catalog, result: { settingId: input.settingId, ...catalog } };
	});
}

export function completeSalesRequestCatalogRegeneration(
	db: Db,
	input: {
		settingId: number;
		generation: number;
		publishedRevision: string;
		counts: Record<string, number>;
	},
) {
	return lockedCatalogUpdate(db, input.settingId, (current) => {
		if (current.publication.generation !== input.generation) {
			throw new Error("Sales request catalog regeneration was superseded");
		}
		const { error: _ignoredError, ...publicationWithoutError } =
			current.publication;
		const publication: SalesRequestCatalogPublication = {
			...publicationWithoutError,
			status: "published",
			publishedRevision: input.publishedRevision,
			counts: input.counts,
		};
		const catalog = { ...current, publication };
		return { catalog, result: { settingId: input.settingId, ...catalog } };
	});
}

export function failSalesRequestCatalogRegeneration(
	db: Db,
	input: { settingId: number; generation: number; error: string },
) {
	return lockedCatalogUpdate(db, input.settingId, (current) => {
		if (current.publication.generation !== input.generation) {
			return {
				catalog: current,
				result: { settingId: input.settingId, ...current, superseded: true },
			};
		}
		const catalog = {
			...current,
			publication: {
				...current.publication,
				status: "failed" as const,
				error: input.error.slice(0, 240),
			},
		};
		return {
			catalog,
			result: { settingId: input.settingId, ...catalog, superseded: false },
		};
	});
}
