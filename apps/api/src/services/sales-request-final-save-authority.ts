import type { SalesRequestLowTouchFinalSaveClaim } from "@api/schemas/new-sales-form";
import {
	SALES_REQUEST_OUTPUT_SCHEMA_VERSION,
	SALES_REQUEST_PROMPT_VERSION,
	type SalesRequestFinalSaveBlocker,
	type SalesRequestFinalSaveCandidate,
	buildSalesRequestCommercialFingerprint,
	evaluateSalesRequestFinalSavePreflight,
} from "@gnd/sales/sales-form/request-generation";
import {
	SALES_REQUEST_PROVIDER_BENCHMARK_CORPUS_VERSION,
	SALES_REQUEST_PROVIDER_BENCHMARK_POLICY_VERSION,
	getSalesRequestAISettings,
	getSalesRequestProviderBenchmarkApproval,
	isSalesRequestProviderBenchmarkApprovalCurrent,
} from "@gnd/settings";
import { resolveSalesRequestCommercialAuthority } from "./sales-request-commercial-authority";
import { getSalesRequestConfigurationContext } from "./sales-request-configuration-context";
import { resolveSalesRequestGenerationRunAuthority } from "./sales-request-generation-run-authority";
import { resolveSalesRequestPermissionAuthority } from "./sales-request-permission-authority";
import { getSalesRequestPilotAccess } from "./sales-request-pilot";
import { resolveSalesRequestStockAuthority } from "./sales-request-stock-authority";

type CommercialInput = Omit<
	Parameters<typeof resolveSalesRequestCommercialAuthority>[0],
	"db"
>;

type AuthorityDatabase = Parameters<
	typeof resolveSalesRequestCommercialAuthority
>[0]["db"] &
	Parameters<typeof resolveSalesRequestGenerationRunAuthority>[0]["db"] &
	Parameters<typeof resolveSalesRequestPermissionAuthority>[0]["db"] &
	Parameters<typeof resolveSalesRequestStockAuthority>[0]["db"] &
	Parameters<typeof getSalesRequestConfigurationContext>[0] &
	Parameters<typeof getSalesRequestAISettings>[0] &
	Parameters<typeof getSalesRequestProviderBenchmarkApproval>[0] &
	Parameters<typeof getSalesRequestPilotAccess>[0]["db"] & {
		settings: {
			findMany: (args: {
				where: { type: "sales-settings"; deletedAt: null };
				select: { id: true };
			}) => Promise<Array<{ id: number }>>;
		};
	};

export type SalesRequestFinalSaveReplayResult = {
	candidate: SalesRequestFinalSaveCandidate | null;
	issues: string[];
};

export type SalesRequestFinalSaveAuthorityIssueCode =
	| "actor-invalid"
	| "surface-invalid"
	| "settings-unavailable"
	| "settings-evidence-invalid"
	| "configuration-stale"
	| "pilot-ineligible"
	| "ai-selection-stale"
	| "generation-authority-failed"
	| "commercial-authority-failed"
	| "permission-authority-failed"
	| "seed-replay-failed"
	| "stock-authority-failed"
	| "preflight-blocked";

export type SalesRequestFinalSaveAuthorityIssue = {
	code: SalesRequestFinalSaveAuthorityIssueCode;
	details?: string[];
};

export type SalesRequestFinalSaveAuthorityResult =
	| {
			ok: true;
			issues: [];
			authority: {
				settingId: number;
				generationId: string;
				configurationRevision: string;
				provider: string;
				model: string;
				commercialRevision: string;
				permissionRevision: string;
				stockRevision: string;
				commercialFingerprint: string;
			};
	  }
	| {
			ok: false;
			issues: SalesRequestFinalSaveAuthorityIssue[];
			authority: null;
	  };

export type SalesRequestFinalSaveAuthorityDependencies = {
	getPilotAccess: typeof getSalesRequestPilotAccess;
	getConfigurationContext: typeof getSalesRequestConfigurationContext;
	getAISettings: typeof getSalesRequestAISettings;
	getBenchmarkApproval: typeof getSalesRequestProviderBenchmarkApproval;
	isBenchmarkCurrent: typeof isSalesRequestProviderBenchmarkApprovalCurrent;
	resolveGenerationRun: typeof resolveSalesRequestGenerationRunAuthority;
	resolveCommercial: typeof resolveSalesRequestCommercialAuthority;
	resolvePermission: typeof resolveSalesRequestPermissionAuthority;
	resolveStock: typeof resolveSalesRequestStockAuthority;
};

const DEFAULT_DEPENDENCIES: SalesRequestFinalSaveAuthorityDependencies = {
	getPilotAccess: getSalesRequestPilotAccess,
	getConfigurationContext: getSalesRequestConfigurationContext,
	getAISettings: getSalesRequestAISettings,
	getBenchmarkApproval: getSalesRequestProviderBenchmarkApproval,
	isBenchmarkCurrent: isSalesRequestProviderBenchmarkApprovalCurrent,
	resolveGenerationRun: resolveSalesRequestGenerationRunAuthority,
	resolveCommercial: resolveSalesRequestCommercialAuthority,
	resolvePermission: resolveSalesRequestPermissionAuthority,
	resolveStock: resolveSalesRequestStockAuthority,
};

function issue(
	code: SalesRequestFinalSaveAuthorityIssueCode,
	details?: string[],
): SalesRequestFinalSaveAuthorityIssue {
	return details?.length ? { code, details } : { code };
}

function positiveInteger(value: unknown): value is number {
	return Number.isSafeInteger(value) && Number(value) > 0;
}

function safeCodes(values: readonly { code: string }[]) {
	return [...new Set(values.map(({ code }) => code))].sort();
}

function preflightCodes(values: readonly SalesRequestFinalSaveBlocker[]) {
	return [...new Set(values.map(({ code }) => code))].sort();
}

/**
 * Resolve every current low-touch authority in the caller's transaction.
 *
 * The callback must replay the strict seed through the native initializer using
 * the supplied fresh configuration plus the returned authoritative coefficient
 * and tax percentage. This service never calls a provider and never writes.
 */
export async function resolveSalesRequestFinalSaveAuthority(input: {
	db: AuthorityDatabase;
	actorUserId: number;
	claim: SalesRequestLowTouchFinalSaveClaim;
	candidate: SalesRequestFinalSaveCandidate;
	commercial: CommercialInput;
	replaySeed: (input: {
		configuration: Awaited<
			ReturnType<typeof getSalesRequestConfigurationContext>
		>;
		profileCoefficient: number;
		taxPercentage: number;
	}) => Promise<SalesRequestFinalSaveReplayResult>;
	dependencies?: SalesRequestFinalSaveAuthorityDependencies;
}): Promise<SalesRequestFinalSaveAuthorityResult> {
	const dependencies = input.dependencies ?? DEFAULT_DEPENDENCIES;
	if (!positiveInteger(input.actorUserId)) {
		return { ok: false, issues: [issue("actor-invalid")], authority: null };
	}
	if (input.candidate.type !== "order" && input.candidate.type !== "quote") {
		return { ok: false, issues: [issue("surface-invalid")], authority: null };
	}

	const settingsRows = await input.db.settings.findMany({
		where: { type: "sales-settings", deletedAt: null },
		select: { id: true },
	});
	const settingIds = settingsRows
		.map(({ id }) => id)
		.filter(positiveInteger)
		.sort((left, right) => left - right);
	if (!settingIds.length) {
		return {
			ok: false,
			issues: [issue("settings-unavailable")],
			authority: null,
		};
	}
	if (new Set(settingIds).size !== settingIds.length) {
		return {
			ok: false,
			issues: [issue("settings-evidence-invalid")],
			authority: null,
		};
	}
	const settingId = settingIds[0];
	if (
		!settingId ||
		input.claim.configurationScope !== `sales-settings:${settingId}`
	) {
		return {
			ok: false,
			issues: [issue("configuration-stale")],
			authority: null,
		};
	}

	const pilot = await dependencies.getPilotAccess({
		db: input.db,
		userId: input.actorUserId,
		surface: input.candidate.type,
	});
	if (!pilot.eligible) {
		return {
			ok: false,
			issues: [issue("pilot-ineligible", [pilot.reason])],
			authority: null,
		};
	}

	const configuration = await dependencies.getConfigurationContext(
		input.db,
		{ settingId },
		{ freshServiceVocabulary: true },
	);
	if (
		configuration.scope !== input.claim.configurationScope ||
		configuration.revision !== input.claim.configurationRevision
	) {
		return {
			ok: false,
			issues: [issue("configuration-stale")],
			authority: null,
		};
	}

	const aiSettings = await dependencies.getAISettings(input.db, settingId);
	if (
		aiSettings.source !== "persisted" ||
		aiSettings.selection.provider !== input.claim.provider ||
		aiSettings.selection.model !== input.claim.model
	) {
		return {
			ok: false,
			issues: [issue("ai-selection-stale")],
			authority: null,
		};
	}
	const benchmark = await dependencies.getBenchmarkApproval(
		input.db,
		settingId,
	);
	const benchmarkCurrent = dependencies.isBenchmarkCurrent(benchmark.approval, {
		...aiSettings.selection,
		configurationRevision: configuration.revision,
		promptVersion: SALES_REQUEST_PROMPT_VERSION,
		schemaVersion: SALES_REQUEST_OUTPUT_SCHEMA_VERSION,
		corpusVersion: SALES_REQUEST_PROVIDER_BENCHMARK_CORPUS_VERSION,
		policyVersion: SALES_REQUEST_PROVIDER_BENCHMARK_POLICY_VERSION,
	});

	const run = await dependencies.resolveGenerationRun({
		db: input.db,
		actorUserId: input.actorUserId,
		claim: input.claim,
	});
	if (!run.ok) {
		return {
			ok: false,
			issues: [issue("generation-authority-failed", safeCodes(run.issues))],
			authority: null,
		};
	}
	if (run.authority.consumedSalesId != null) {
		return {
			ok: false,
			issues: [issue("generation-authority-failed", ["already-consumed"])],
			authority: null,
		};
	}

	const commercial = await dependencies.resolveCommercial({
		db: input.db,
		...input.commercial,
	});
	if (!commercial.ok) {
		return {
			ok: false,
			issues: [
				issue("commercial-authority-failed", safeCodes(commercial.issues)),
			],
			authority: null,
		};
	}
	const permission = await dependencies.resolvePermission({
		db: input.db,
		actorUserId: input.actorUserId,
		surface: input.candidate.type,
	});
	if (!permission.ok) {
		return {
			ok: false,
			issues: [
				issue("permission-authority-failed", safeCodes(permission.issues)),
			],
			authority: null,
		};
	}

	let replay: SalesRequestFinalSaveReplayResult;
	try {
		replay = await input.replaySeed({
			configuration,
			profileCoefficient: commercial.authority.coefficient,
			taxPercentage: commercial.authority.taxPercentage,
		});
	} catch {
		return {
			ok: false,
			issues: [issue("seed-replay-failed")],
			authority: null,
		};
	}
	if (!replay.candidate || replay.issues.length) {
		return {
			ok: false,
			issues: [issue("seed-replay-failed", replay.issues)],
			authority: null,
		};
	}

	const stock = await dependencies.resolveStock({
		db: input.db,
		candidate: { lineItems: input.candidate.lineItems },
	});
	if (!stock.ok) {
		return {
			ok: false,
			issues: [issue("stock-authority-failed", safeCodes(stock.issues))],
			authority: null,
		};
	}

	const expectedFingerprint = buildSalesRequestCommercialFingerprint(
		replay.candidate,
	);
	const preflight = evaluateSalesRequestFinalSavePreflight({
		candidate: input.candidate,
		authoritative: {
			configurationScope: configuration.scope,
			configurationRevision: configuration.revision,
			provider: aiSettings.selection.provider,
			model: aiSettings.selection.model,
			providerBenchmark: {
				provider: aiSettings.selection.provider,
				model: aiSettings.selection.model,
				passed: benchmarkCurrent,
			},
			customerId: commercial.authority.customerId,
			customerProfileId: commercial.authority.customerProfileId,
			customerProfileRevision: commercial.authority.revision,
			stock: "known",
			tax: "known",
			permission: {
				allowed: true,
				revision: permission.authority.revision,
			},
		},
		run: {
			generated: {
				source: "pasted-text",
				configurationScope: run.authority.configurationScope,
				configurationRevision: run.authority.configurationRevision,
				provider: run.authority.provider,
				model: run.authority.model,
				seedDigest: run.authority.seedDigest,
				unsupportedFactCount: run.authority.unsupportedFactCount,
				customValueCount: run.authority.customValueCount,
				unpricedItemCount: run.authority.unpricedItemCount,
			},
			applied: {
				commercialFingerprint: expectedFingerprint,
				seedDigest: run.authority.seedDigest,
				customerId: commercial.authority.customerId,
				customerProfileId: commercial.authority.customerProfileId,
				customerProfileRevision: commercial.authority.revision,
				permissionRevision: permission.authority.revision,
			},
		},
	});
	if (!preflight.ok) {
		return {
			ok: false,
			issues: [issue("preflight-blocked", preflightCodes(preflight.blockers))],
			authority: null,
		};
	}

	return {
		ok: true,
		issues: [],
		authority: {
			settingId,
			generationId: run.authority.generationId,
			configurationRevision: configuration.revision,
			provider: aiSettings.selection.provider,
			model: aiSettings.selection.model,
			commercialRevision: commercial.authority.revision,
			permissionRevision: permission.authority.revision,
			stockRevision: stock.authority.revision,
			commercialFingerprint: preflight.commercialFingerprint,
		},
	};
}
