import { getSalesRequestConfigurationContext } from "@api/services/sales-request-configuration-context";
import { selectSalesRequestSettingId } from "@api/services/sales-request-preview";
import type { Database } from "@gnd/db";
import { AppError } from "@gnd/errors";
import {
	SALES_REQUEST_OUTPUT_SCHEMA_VERSION,
	SALES_REQUEST_PROMPT_VERSION,
} from "@gnd/sales/sales-form/request-generation";
import {
	SALES_REQUEST_PROVIDER_BENCHMARK_CORPUS_VERSION,
	SALES_REQUEST_PROVIDER_BENCHMARK_POLICY_VERSION,
	getSalesRequestAISettings,
	getSalesRequestPilotReviewPolicy,
	getSalesRequestPilotSettings,
	getSalesRequestProviderBenchmarkApproval,
	isSalesRequestProviderBenchmarkApprovalCurrent,
} from "@gnd/settings";
import { TRPCError } from "@trpc/server";
import type { SalesRequestPilotCurrentAuthority } from "./sales-request-pilot-advancement";
import {
	createSalesRequestPilotAuthority,
	isSalesRequestPilotReviewPolicyCurrent,
} from "./sales-request-pilot-review";
import type { SalesRequestGenerationPilotAuthority } from "./sales-request-telemetry";

type ReviewAuthorityDatabase = Pick<Database, "settings" | "users"> &
	Parameters<typeof getSalesRequestConfigurationContext>[0];

type ReviewPolicyResult = Awaited<
	ReturnType<typeof getSalesRequestPilotReviewPolicy>
>;

export type SalesRequestPilotAuthorityBlocker =
	| "pilot-disabled"
	| "pilot-settings-unavailable"
	| "provider-benchmark-unavailable"
	| "review-policy-unavailable";

export type SalesRequestPilotReviewAuthorityResolution = {
	settingId: number;
	baseAuthority: SalesRequestGenerationPilotAuthority | null;
	currentAuthority: SalesRequestPilotCurrentAuthority | null;
	authorityBlockers: SalesRequestPilotAuthorityBlocker[];
	reviewPolicy: {
		source: ReviewPolicyResult["source"];
		current: boolean;
		policy: ReviewPolicyResult["policy"];
	};
};

type CurrentSalesRequestPilotReviewAuthorityResolution =
	SalesRequestPilotReviewAuthorityResolution & {
		baseAuthority: SalesRequestGenerationPilotAuthority;
		currentAuthority: SalesRequestPilotCurrentAuthority;
		reviewPolicy: {
			source: "persisted";
			current: true;
			policy: NonNullable<ReviewPolicyResult["policy"]>;
		};
	};

export async function requireNamedActiveSalesRequestPilotReviewer(input: {
	db: Pick<Database, "users">;
	userId: number | undefined;
	reviewerUserIds: readonly number[];
}) {
	if (!input.userId) throw new TRPCError({ code: "UNAUTHORIZED" });
	if (!input.reviewerUserIds.includes(input.userId)) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Only a named Sales Request pilot reviewer can record a review.",
		});
	}
	const reviewer = await input.db.users.findFirst({
		where: {
			id: input.userId,
			deletedAt: null,
			accessRevokedAt: null,
		},
		select: { id: true },
	});
	if (!reviewer) throw new TRPCError({ code: "UNAUTHORIZED" });
}

function benchmarkIsCurrent(input: {
	aiSettings: Awaited<ReturnType<typeof getSalesRequestAISettings>>;
	configurationRevision: string;
	providerBenchmark: Awaited<
		ReturnType<typeof getSalesRequestProviderBenchmarkApproval>
	>;
}) {
	return (
		input.aiSettings.source === "persisted" &&
		input.providerBenchmark.source === "persisted" &&
		input.providerBenchmark.approval !== null &&
		isSalesRequestProviderBenchmarkApprovalCurrent(
			input.providerBenchmark.approval,
			{
				...input.aiSettings.selection,
				configurationRevision: input.configurationRevision,
				promptVersion: SALES_REQUEST_PROMPT_VERSION,
				schemaVersion: SALES_REQUEST_OUTPUT_SCHEMA_VERSION,
				corpusVersion: SALES_REQUEST_PROVIDER_BENCHMARK_CORPUS_VERSION,
				policyVersion: SALES_REQUEST_PROVIDER_BENCHMARK_POLICY_VERSION,
			},
		)
	);
}

export async function resolveSalesRequestPilotReviewAuthority(input: {
	db: ReviewAuthorityDatabase;
	featureEnabled: boolean;
	reviewerUserId: number;
}): Promise<CurrentSalesRequestPilotReviewAuthorityResolution>;
export async function resolveSalesRequestPilotReviewAuthority(input: {
	db: ReviewAuthorityDatabase;
	featureEnabled: boolean;
}): Promise<SalesRequestPilotReviewAuthorityResolution>;
export async function resolveSalesRequestPilotReviewAuthority(input: {
	db: ReviewAuthorityDatabase;
	featureEnabled: boolean;
	reviewerUserId?: number;
}): Promise<SalesRequestPilotReviewAuthorityResolution> {
	const rows = await input.db.settings.findMany({
		where: { type: "sales-settings", deletedAt: null },
		select: { id: true },
	});
	const settingId = selectSalesRequestSettingId(rows.map((row) => row.id));
	const [aiSettings, pilot, providerBenchmark, reviewPolicy] =
		await Promise.all([
			getSalesRequestAISettings(input.db, settingId),
			getSalesRequestPilotSettings(input.db, settingId),
			getSalesRequestProviderBenchmarkApproval(input.db, settingId),
			getSalesRequestPilotReviewPolicy(input.db, settingId),
		]);

	const pilotCurrent =
		input.featureEnabled &&
		pilot.source === "persisted" &&
		pilot.settings.enabled &&
		pilot.settings.revision > 0;
	if (input.reviewerUserId !== undefined) {
		if (!pilotCurrent) {
			throw new TRPCError({
				code: "PRECONDITION_FAILED",
				message: "The Sales Request pilot is not active.",
			});
		}
		await requireNamedActiveSalesRequestPilotReviewer({
			db: input.db,
			userId: input.reviewerUserId,
			reviewerUserIds: pilot.settings.reviewerUserIds,
		});
	}

	const snapshot = await getSalesRequestConfigurationContext(input.db, {
		settingId,
	});
	const benchmarkCurrent = benchmarkIsCurrent({
		aiSettings,
		configurationRevision: snapshot.revision,
		providerBenchmark,
	});
	if (input.reviewerUserId !== undefined && !benchmarkCurrent) {
		throw new AppError({
			code: "VALIDATION_FAILED",
			publicMessage:
				"The selected Sales Request provider and model need a current benchmark approval before generation.",
			transportCode: "PRECONDITION_FAILED",
			reportable: false,
		});
	}
	const reviewPolicyCurrent =
		reviewPolicy.source === "persisted" &&
		reviewPolicy.policy !== null &&
		isSalesRequestPilotReviewPolicyCurrent(
			reviewPolicy.policy,
			aiSettings.selection,
		) &&
		reviewPolicy.policy.thresholds.policyVersion ===
			providerBenchmark.approval?.policyVersion;
	if (input.reviewerUserId !== undefined && !reviewPolicyCurrent) {
		throw new TRPCError({
			code: "PRECONDITION_FAILED",
			message: "A current, benchmark-matched pilot review policy is required.",
		});
	}

	const authorityBlockers: SalesRequestPilotAuthorityBlocker[] = [];
	if (!input.featureEnabled || !pilot.settings.enabled) {
		authorityBlockers.push("pilot-disabled");
	}
	if (pilot.source !== "persisted" || pilot.settings.revision <= 0) {
		authorityBlockers.push("pilot-settings-unavailable");
	}
	if (!benchmarkCurrent) {
		authorityBlockers.push("provider-benchmark-unavailable");
	}
	if (!reviewPolicyCurrent) {
		authorityBlockers.push("review-policy-unavailable");
	}

	const baseAuthority =
		authorityBlockers.length === 0 && providerBenchmark.approval
			? {
					scope: snapshot.scope,
					configurationRevision: snapshot.revision,
					provider: aiSettings.selection.provider,
					model: aiSettings.selection.model,
					promptVersion: SALES_REQUEST_PROMPT_VERSION,
					schemaVersion: SALES_REQUEST_OUTPUT_SCHEMA_VERSION,
					pilotSettingsRevision: pilot.settings.revision,
					providerBenchmarkApprovalRevision:
						providerBenchmark.approval.revision,
				}
			: null;
	const currentAuthority =
		baseAuthority && reviewPolicy.policy
			? createSalesRequestPilotAuthority(baseAuthority, reviewPolicy.policy)
			: null;

	return {
		settingId,
		baseAuthority,
		currentAuthority,
		authorityBlockers,
		reviewPolicy: {
			source: reviewPolicy.source,
			current: reviewPolicyCurrent,
			policy: reviewPolicy.policy,
		},
	};
}
