import type {
	CustomerProfileRecord,
	ResolveNewSalesFormSeedComponents,
	WorkflowComponentRecord,
	WorkflowRouteData,
} from "@gnd/sales/sales-form";
import type { SalesRequestGeneratePreviewOutput } from "./request-generation-controller";
import {
	type ApplyRequestGenerationProposalResult,
	type PreparedRequestGenerationProposal,
	type RequestGenerationPreparationIssue,
	prepareRequestGenerationProposal,
} from "./request-generation-transaction";
import type { NewSalesFormRecord } from "./schema";

export type SalesRequestGenerationApplyBlockedReason =
	| "missing-preview"
	| "route-unavailable"
	| "configuration-validator-required"
	| "configuration-unavailable"
	| "configuration-stale"
	| "persisted-record"
	| "profile-unavailable"
	| "profile-invalid"
	| "unresolved"
	| "initializer-issue"
	| "form-stale"
	| "apply-unavailable";

export type SalesRequestGenerationApplyResult =
	| {
			status: "ready";
			proposal: PreparedRequestGenerationProposal;
	  }
	| {
			status: "applied" | "already-applied";
			proposal: PreparedRequestGenerationProposal;
	  }
	| {
			status: "blocked";
			reason: SalesRequestGenerationApplyBlockedReason;
			issues: RequestGenerationPreparationIssue[];
	  }
	| {
			status: "configuration-stale";
			expectedRevision: string;
			currentRevision: string;
	  }
	| {
			status: "error";
			error: unknown;
	  };

export type SalesRequestGenerationConfigurationValidator = () =>
	| string
	| null
	| undefined
	| Promise<string | null | undefined>;

export function getSalesRequestGenerationProposalId(
	preview: SalesRequestGeneratePreviewOutput | null | undefined,
) {
	const generationId = String(preview?.generationId || "").trim();
	return generationId || null;
}

export type SalesRequestGenerationApplyInput = {
	preview: SalesRequestGeneratePreviewOutput | null | undefined;
	proposalId: string;
	baseRecord: NewSalesFormRecord;
	routeData: WorkflowRouteData | null | undefined;
	profileRecords?: readonly CustomerProfileRecord[] | null;
	validateConfigurationRevision?: SalesRequestGenerationConfigurationValidator;
	resolveComponents: ResolveNewSalesFormSeedComponents;
	applyProposal: (
		proposal: PreparedRequestGenerationProposal,
		currentConfigurationRevision: string,
	) => ApplyRequestGenerationProposalResult;
	/** Used by presentation-only tests and callers that need an isolated candidate. */
	performApply?: boolean;
};

export type SalesRequestGenerationProfileResolution =
	| { status: "ready"; profileCoefficient: number }
	| {
			status: "blocked";
			reason: "profile-unavailable" | "profile-invalid";
	  };

function readRecord(value: unknown): Record<string, unknown> {
	if (typeof value === "string") {
		try {
			return readRecord(JSON.parse(value));
		} catch {
			return {};
		}
	}
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

function readTransportCode(error: unknown) {
	const record = readRecord(error);
	const data = readRecord(record.data);
	const shape = readRecord(record.shape);
	const shapeData = readRecord(shape.data);
	return String(data.code || shapeData.code || record.code || "").toUpperCase();
}

function isConfigurationConflict(error: unknown) {
	return readTransportCode(error) === "CONFLICT";
}

export function extractRequestGenerationDefaults(
	routeData: WorkflowRouteData | null | undefined,
): Readonly<Record<string, Readonly<Record<string, string>>>> {
	const settingsMeta = readRecord(routeData?.settingsMeta);
	const directRoute = readRecord(settingsMeta.route);
	const nestedData = readRecord(settingsMeta.data);
	const route = Object.keys(directRoute).length
		? directRoute
		: readRecord(nestedData.route);
	const defaultsByItemTypeUid: Record<
		string,
		Readonly<Record<string, string>>
	> = {};

	for (const [itemTypeUid, rawRouteDefinition] of Object.entries(route)) {
		const routeDefinition = readRecord(rawRouteDefinition);
		const requestGeneration = readRecord(routeDefinition.requestGeneration);
		const defaults = readRecord(requestGeneration.defaults);
		const entries = Object.entries(defaults).filter(
			(entry): entry is [string, string] => typeof entry[1] === "string",
		);
		if (entries.length)
			defaultsByItemTypeUid[itemTypeUid] = Object.fromEntries(entries);
	}
	return defaultsByItemTypeUid;
}

export function resolveSalesRequestProfileCoefficient(
	record: NewSalesFormRecord,
	profileRecords: readonly CustomerProfileRecord[] | null | undefined,
): SalesRequestGenerationProfileResolution {
	const selectedProfileId = Number(
		(record.form as { customerProfileId?: unknown } | null | undefined)
			?.customerProfileId || 0,
	);
	if (!selectedProfileId) {
		return { status: "ready", profileCoefficient: 1 };
	}
	const profile = (profileRecords || []).find(
		(candidate) => Number(candidate?.id || 0) === selectedProfileId,
	);
	if (!profile) return { status: "blocked", reason: "profile-unavailable" };
	const coefficient = Number(profile.coefficient || 0);
	if (!Number.isFinite(coefficient) || coefficient <= 0) {
		return { status: "blocked", reason: "profile-invalid" };
	}
	return { status: "ready", profileCoefficient: coefficient };
}

export type FreshStepComponentsClient = {
	sales: {
		getStepComponents: {
			query: (input: {
				stepId?: number;
				stepTitle?: string | null;
				fresh?: boolean;
			}) => Promise<readonly WorkflowComponentRecord[]>;
		};
	};
};

export function createFreshStepComponentsResolver(
	client: FreshStepComponentsClient,
): ResolveNewSalesFormSeedComponents {
	return ({ step }) =>
		client.sales.getStepComponents.query({
			stepId:
				Number.isSafeInteger(Number(step.id)) && Number(step.id) > 0
					? Number(step.id)
					: undefined,
			stepTitle: step.title ?? undefined,
			fresh: true,
		});
}

function blocked(
	reason: SalesRequestGenerationApplyBlockedReason,
	issues: RequestGenerationPreparationIssue[] = [],
): SalesRequestGenerationApplyResult {
	return { status: "blocked", reason, issues };
}

function unresolvedIssues(
	unresolved: PreparedRequestGenerationProposal["unresolved"],
): RequestGenerationPreparationIssue[] {
	return unresolved.map((entry) => ({
		lineUid: entry.lineUid,
		stepId: null,
		reason: "unresolved-facts" as const,
	}));
}

function mapStoreApplyResult(
	result: ApplyRequestGenerationProposalResult,
	proposal: PreparedRequestGenerationProposal,
	expectedRevision: string,
): SalesRequestGenerationApplyResult {
	switch (result.status) {
		case "applied":
		case "already-applied":
			return { status: result.status, proposal };
		case "configuration-stale":
			return {
				status: "configuration-stale",
				expectedRevision: proposal.configurationRevision,
				currentRevision: expectedRevision,
			};
		case "unresolved":
			return blocked("unresolved", unresolvedIssues(proposal.unresolved));
		case "stale":
			return blocked("form-stale");
		default:
			return blocked("apply-unavailable");
	}
}

export async function applySalesRequestGenerationProposal(
	input: SalesRequestGenerationApplyInput,
): Promise<SalesRequestGenerationApplyResult> {
	const preview = input.preview;
	if (!preview) return blocked("missing-preview");
	if (!input.routeData) return blocked("route-unavailable");
	if (input.baseRecord.salesId != null) return blocked("persisted-record");
	if (!input.validateConfigurationRevision) {
		return blocked("configuration-validator-required");
	}
	const expectedRevision = String(preview.configurationRevision || "").trim();
	if (!expectedRevision) return blocked("configuration-unavailable");
	if (preview.seed.unresolved.length > 0) {
		return blocked("unresolved", unresolvedIssues(preview.seed.unresolved));
	}

	try {
		const initialRevision = String(
			(await input.validateConfigurationRevision()) || "",
		).trim();
		if (!initialRevision) return blocked("configuration-unavailable");
		if (initialRevision !== expectedRevision) {
			return {
				status: "configuration-stale",
				expectedRevision,
				currentRevision: initialRevision,
			};
		}

		const profile = resolveSalesRequestProfileCoefficient(
			input.baseRecord,
			input.profileRecords,
		);
		if (profile.status === "blocked") return blocked(profile.reason);

		const prepared = await prepareRequestGenerationProposal({
			proposalId: input.proposalId,
			configurationRevision: expectedRevision,
			seed: preview.seed,
			baseRecord: input.baseRecord,
			routeData: input.routeData,
			defaultsByItemTypeUid: extractRequestGenerationDefaults(input.routeData),
			pricing: { profileCoefficient: profile.profileCoefficient },
			resolveComponents: input.resolveComponents,
		});
		if (prepared.status === "blocked") {
			return blocked(
				prepared.unresolved.length > 0 ? "unresolved" : "initializer-issue",
				prepared.issues,
			);
		}
		if (input.performApply === false) {
			return { status: "ready", proposal: prepared.proposal };
		}

		const currentRevision = String(
			(await input.validateConfigurationRevision()) || "",
		).trim();
		if (!currentRevision) return blocked("configuration-unavailable");
		if (currentRevision !== expectedRevision) {
			return {
				status: "configuration-stale",
				expectedRevision,
				currentRevision,
			};
		}

		return mapStoreApplyResult(
			input.applyProposal(prepared.proposal, currentRevision),
			prepared.proposal,
			currentRevision,
		);
	} catch (error) {
		if (isConfigurationConflict(error)) {
			return {
				status: "configuration-stale",
				expectedRevision,
				currentRevision: "changed",
			};
		}
		return { status: "error", error };
	}
}
