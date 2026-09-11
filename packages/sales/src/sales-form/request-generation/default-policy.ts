import { isComponentVisibleByRules } from "../domain/step-engine";

export type RequestStepInputStatus =
	| "specified"
	| "omitted"
	| "ambiguous"
	| "unreadable";

export type RequestStepCandidate = {
	uid: string;
	variations?: readonly {
		rules?: readonly {
			stepUid?: string | null;
			operator?: string | null;
			componentsUid?: readonly string[] | string | null;
		}[];
	}[];
	isDeleted?: boolean;
};

export type ResolveRequestStepSelectionInput = {
	stepUid: string;
	inputStatus: RequestStepInputStatus;
	requestedComponentUid: string | null;
	defaultComponentUid: string | null;
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

	const defaultCandidate = findCandidate(
		input.candidates,
		input.defaultComponentUid,
	);
	if (!defaultCandidate) {
		return {
			status: "unresolved",
			reason: input.defaultComponentUid
				? "default-component-missing"
				: "default-component-not-configured",
		};
	}
	if (defaultCandidate.isDeleted) {
		return { status: "unresolved", reason: "default-component-deleted" };
	}

	const resolvedStepUids = new Set(input.resolvedStepUids);
	const unresolvedDependency = Array.from(
		getVariationDependencyStepUids(defaultCandidate),
	).find((stepUid) => !resolvedStepUids.has(stepUid));
	if (unresolvedDependency) {
		return {
			status: "unresolved",
			reason: `default-dependency-unresolved:${unresolvedDependency}`,
		};
	}

	if (
		!isCandidateVisible(
			defaultCandidate,
			selectedByStepUid,
			input.selectedProdUidsByStepUid,
		)
	) {
		return {
			status: "unresolved",
			reason: "default-component-not-visible",
		};
	}

	return {
		status: "selected",
		componentUid: defaultCandidate.uid,
		source: "default",
	};
}
