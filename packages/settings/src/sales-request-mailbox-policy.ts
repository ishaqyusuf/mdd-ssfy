import { type Db, Prisma } from "@gnd/db";
import {
	DEFAULT_SALES_REQUEST_MAILBOX_POLICY,
	type SalesRequestMailboxPolicy,
	type SalesRequestMailboxPolicyInput,
	normalizeMailboxPolicy,
	salesRequestMailboxPolicySchema,
} from "@gnd/sales-request-mailbox";

const SALES_SETTINGS_TYPE = "sales-settings";
const SETTINGS_TRANSACTION_TIMEOUT_MS = 60_000;

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
	if (!Number.isSafeInteger(value) || Number(value) <= 0) {
		throw new Error("A valid sales settings ID is required");
	}
}

export type SalesRequestMailboxPolicySource =
	| "default"
	| "invalid"
	| "persisted";

export type SalesRequestMailboxPolicyResult = {
	settingId: number;
	policy: SalesRequestMailboxPolicy;
	source: SalesRequestMailboxPolicySource;
};

function readPolicy(
	meta: unknown,
): Omit<SalesRequestMailboxPolicyResult, "settingId"> {
	const root = strictRecord(meta, "metadata");
	const requestGeneration = strictRecord(
		root.requestGeneration,
		"requestGeneration",
	);
	if (!Object.hasOwn(requestGeneration, "mailbox")) {
		return {
			policy: { ...DEFAULT_SALES_REQUEST_MAILBOX_POLICY },
			source: "default",
		};
	}
	const parsed = salesRequestMailboxPolicySchema.safeParse(
		requestGeneration.mailbox,
	);
	if (!parsed.success) {
		return {
			policy: { ...DEFAULT_SALES_REQUEST_MAILBOX_POLICY },
			source: "invalid",
		};
	}
	return { policy: parsed.data, source: "persisted" };
}

export async function getSalesRequestMailboxPolicy(
	db: Pick<Db, "settings">,
	settingId: number,
): Promise<SalesRequestMailboxPolicyResult> {
	requireSettingId(settingId);
	const setting = await db.settings.findFirst({
		where: { id: settingId, type: SALES_SETTINGS_TYPE, deletedAt: null },
		select: { id: true, meta: true },
	});
	if (!setting) throw new Error(`Sales settings not found: ${settingId}`);
	if (setting.id !== settingId) {
		throw new Error(`Sales settings identity mismatch: ${settingId}`);
	}
	return { settingId, ...readPolicy(setting.meta) };
}

export type UpdateSalesRequestMailboxPolicyInput =
	SalesRequestMailboxPolicyInput & {
		settingId: number;
		changedAt?: Date;
	};

export type SalesRequestMailboxPolicyUpdate =
	SalesRequestMailboxPolicyResult & { changed: boolean };

export async function updateSalesRequestMailboxPolicy(
	db: Db,
	rawInput: UpdateSalesRequestMailboxPolicyInput,
): Promise<SalesRequestMailboxPolicyUpdate> {
	const settingId = rawInput?.settingId;
	requireSettingId(settingId);
	const input = normalizeMailboxPolicy({
		enabled: rawInput.enabled,
		supportedProviders: rawInput.supportedProviders,
		eligibleUserIds: rawInput.eligibleUserIds,
		retentionDays: rawInput.retentionDays,
		maximumAutomationMode: rawInput.maximumAutomationMode,
		emergencyDisabled: rawInput.emergencyDisabled,
		allowAttachments: rawInput.allowAttachments,
		maxAttachmentBytes: rawInput.maxAttachmentBytes,
	});
	const changedAt = rawInput.changedAt ?? new Date();

	return db.$transaction(
		async (tx) => {
			const lockedRows = await tx.$queryRaw<Array<{ id: number }>>(
				Prisma.sql`SELECT id FROM Settings
					WHERE id=${settingId}
					  AND type=${SALES_SETTINGS_TYPE}
					  AND deletedAt IS NULL
					FOR UPDATE`,
			);
			if (!lockedRows.some((row) => row.id === settingId)) {
				throw new Error(`Sales settings not found: ${settingId}`);
			}
			const setting = await tx.settings.findFirst({
				where: { id: settingId, type: SALES_SETTINGS_TYPE, deletedAt: null },
				select: { id: true, meta: true },
			});
			if (!setting) throw new Error(`Sales settings not found: ${settingId}`);

			const meta = { ...strictRecord(setting.meta, "metadata") };
			const current = readPolicy(meta);
			const comparableCurrent = {
				enabled: current.policy.enabled,
				supportedProviders: current.policy.supportedProviders,
				eligibleUserIds: current.policy.eligibleUserIds,
				retentionDays: current.policy.retentionDays,
				maximumAutomationMode: current.policy.maximumAutomationMode,
				emergencyDisabled: current.policy.emergencyDisabled,
				allowAttachments: current.policy.allowAttachments,
				maxAttachmentBytes: current.policy.maxAttachmentBytes,
			};
			if (
				current.source === "persisted" &&
				JSON.stringify(comparableCurrent) === JSON.stringify(input)
			) {
				return {
					changed: false,
					settingId,
					policy: current.policy,
					source: "persisted" as const,
				};
			}

			const next: SalesRequestMailboxPolicy = {
				...input,
				revision: current.policy.revision + 1,
				changedAt: changedAt.toISOString(),
			};
			meta.requestGeneration = {
				...strictRecord(meta.requestGeneration, "requestGeneration"),
				mailbox: next,
			};
			await tx.settings.update({ where: { id: settingId }, data: { meta } });
			return {
				changed: true,
				settingId,
				policy: next,
				source: "persisted" as const,
			};
		},
		{
			isolationLevel: "Serializable",
			timeout: SETTINGS_TRANSACTION_TIMEOUT_MS,
		},
	);
}
