import { isComponentVisibleByRules } from "../domain/step-engine";
import { compareSalesRequestComponents } from "./configuration-serializer";

export type RequestStepInputStatus =
	| "specified"
	| "omitted"
	| "ambiguous"
	| "unreadable";

export type RequestStepCandidate = {
	uid: string;
	title?: string;
	sortIndex?: number | null;
	variations?: readonly {
		rules?: readonly {
			stepUid?: string | null;
			operator?: string | null;
			componentsUid?: readonly string[] | string | null;
		}[];
	}[];
	isDeleted?: boolean;
	custom?: boolean;
	default?: true;
};

function compareRequestStepCandidates(
	left: RequestStepCandidate,
	right: RequestStepCandidate,
) {
	return compareSalesRequestComponents(
		{
			uid: left.uid,
			title: left.title || "",
			sortIndex: left.sortIndex,
			...(left.default === true ? { default: true as const } : {}),
		},
		{
			uid: right.uid,
			title: right.title || "",
			sortIndex: right.sortIndex,
			...(right.default === true ? { default: true as const } : {}),
		},
	);
}

export type ResolveRequestStepSelectionInput = {
	stepUid: string;
	inputStatus: RequestStepInputStatus;
	requestedComponentUid: string | null;
	candidates: readonly RequestStepCandidate[];
	selectedByStepUid?: Readonly<Record<string, string>>;
	selectedProdUidsByStepUid?: Readonly<Record<string, readonly string[]>>;
	resolvedStepUids: readonly string[];
};

export type RequestStepSelectionResult =
	| {
			status: "selected";
			componentUid: string;
			source: "request" | "default";
	  }
	| {
			status: "unresolved";
			reason: string;
	  };

function findCandidate(
	candidates: readonly RequestStepCandidate[],
	componentUid: string | null,
) {
	if (!componentUid) return null;
	return candidates.find((candidate) => candidate.uid === componentUid) ?? null;
}

function isCandidateVisible(
	candidate: RequestStepCandidate,
	selectedByStepUid: Readonly<Record<string, string>>,
	selectedProdUidsByStepUid?: Readonly<Record<string, readonly string[]>>,
) {
	const selectedProdUids = selectedProdUidsByStepUid
		? Object.fromEntries(
				Object.entries(selectedProdUidsByStepUid).map(([stepUid, uids]) => [
					stepUid,
					[...uids],
				]),
			)
		: undefined;

	return isComponentVisibleByRules(
		candidate,
		selectedByStepUid,
		selectedProdUids,
	);
}

function getVariationDependencyStepUids(candidate: RequestStepCandidate) {
	const dependencies = new Set<string>();
	for (const variation of candidate.variations ?? []) {
		for (const rule of variation.rules ?? []) {
			const stepUid = String(rule.stepUid ?? "").trim();
			if (stepUid) dependencies.add(stepUid);
		}
	}
	return dependencies;
}

export function resolveRequestStepSelection(
	input: ResolveRequestStepSelectionInput,
): RequestStepSelectionResult {
	const selectedByStepUid = input.selectedByStepUid ?? {};

	if (input.inputStatus === "ambiguous") {
		return { status: "unresolved", reason: "input-ambiguous" };
	}
	if (input.inputStatus === "unreadable") {
		return { status: "unresolved", reason: "input-unreadable" };
	}

	if (input.inputStatus === "specified") {
		const requested = findCandidate(
			input.candidates,
			input.requestedComponentUid,
		);
		if (!requested) {
			return {
				status: "unresolved",
				reason: input.requestedComponentUid
					? "requested-component-missing"
					: "requested-component-not-provided",
			};
		}
		if (requested.isDeleted) {
			return { status: "unresolved", reason: "requested-component-deleted" };
		}
		if (
			!isCandidateVisible(
				requested,
				selectedByStepUid,
				input.selectedProdUidsByStepUid,
			)
		) {
			return {
				status: "unresolved",
				reason: "requested-component-not-visible",
			};
		}
		return {
			status: "selected",
			componentUid: requested.uid,
			source: "request",
		};
	}

	const resolvedStepUids = new Set(input.resolvedStepUids);
	const orderedCandidates = [...input.candidates].sort(
		compareRequestStepCandidates,
	);
	const defaultCandidate = orderedCandidates.find((candidate) => {
		if (candidate.isDeleted || candidate.custom) return false;
		if (
			Array.from(getVariationDependencyStepUids(candidate)).some(
				(stepUid) => !resolvedStepUids.has(stepUid),
			)
		) {
			return false;
		}
		return isCandidateVisible(
			candidate,
			selectedByStepUid,
			input.selectedProdUidsByStepUid,
		);
	});
	if (!defaultCandidate) {
		return { status: "unresolved", reason: "default-component-not-configured" };
	}

	return {
		status: "selected",
		componentUid: defaultCandidate.uid,
		source: "default",
	};
}
