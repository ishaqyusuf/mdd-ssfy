import type { SalesRequestCatalogPolicy } from "@gnd/settings";

export type SalesRequestCatalogCandidate = {
	id: number;
	uid: string | null;
	dykeStepId: number;
	custom?: boolean | null;
	createdAt?: Date | string | null;
	sortIndex?: number | null;
	metric?: { selectionCount?: number | null } | null;
	meta: unknown;
	name: string | null;
	redirectUid: string | null;
	product?: { title: string | null } | null;
	door?: { title: string | null } | null;
};

export type SalesRequestCatalogDiagnostics = {
	totalActiveRows: number;
	totalActiveStandardRows: number;
	excludedCustom: number;
	excludedUnused: number;
	usedInclusions: number;
	defaultInclusions: number;
	gracePeriodInclusions: number;
	pinnedInclusions: number;
	dependencyClosureAdditions: number;
	routeNecessityInclusions: number;
	explicitExclusions: number;
	unreachableExclusions: number;
	finalTupleCount: number;
};

function candidateTitle(candidate: SalesRequestCatalogCandidate) {
	return (
		candidate.name ||
		candidate.door?.title ||
		candidate.product?.title ||
		""
	).trim();
}

function compareCandidates(
	left: SalesRequestCatalogCandidate,
	right: SalesRequestCatalogCandidate,
) {
	const leftIndex = Number.isFinite(left.sortIndex)
		? (left.sortIndex as number)
		: Number.MAX_SAFE_INTEGER;
	const rightIndex = Number.isFinite(right.sortIndex)
		? (right.sortIndex as number)
		: Number.MAX_SAFE_INTEGER;
	if (leftIndex !== rightIndex) return leftIndex - rightIndex;
	const byTitle = candidateTitle(left).localeCompare(candidateTitle(right));
	if (byTitle) return byTitle;
	return String(left.uid ?? "").localeCompare(String(right.uid ?? ""));
}

function createdWithin(candidate: SalesRequestCatalogCandidate, cutoff: Date) {
	if (!candidate.createdAt) return false;
	const createdAt = new Date(candidate.createdAt);
	return Number.isFinite(createdAt.getTime()) && createdAt >= cutoff;
}

function readRecord(value: unknown): Record<string, unknown> | undefined {
	if (typeof value === "string") {
		try {
			return readRecord(JSON.parse(value));
		} catch {
			return undefined;
		}
	}
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: undefined;
}

function visibilityDependencies(candidate: SalesRequestCatalogCandidate) {
	const meta = readRecord(candidate.meta);
	if (!meta || !Array.isArray(meta.variations)) return [];
	const dependencies: string[] = [];
	for (const variation of meta.variations) {
		const record = readRecord(variation);
		if (!record || !Array.isArray(record.rules)) continue;
		for (const rule of record.rules) {
			const ruleRecord = readRecord(rule);
			if (!ruleRecord || !Array.isArray(ruleRecord.componentsUid)) continue;
			for (const uid of ruleRecord.componentsUid) {
				if (typeof uid === "string" && uid.trim())
					dependencies.push(uid.trim());
			}
		}
	}
	return dependencies;
}

/**
 * Select the compact standard vocabulary without letting historical popularity
 * become default or ranking authority. The caller supplies active rows only.
 */
export function selectSalesRequestCatalogCandidates(input: {
	components: readonly SalesRequestCatalogCandidate[];
	defaultComponentUids: ReadonlySet<string>;
	policy: SalesRequestCatalogPolicy;
	now?: Date;
}) {
	const activeStandard = input.components.filter(
		(component) => component.custom !== true && Boolean(component.uid),
	);
	const byUid = new Map(
		activeStandard.map((component) => [component.uid as string, component]),
	);
	const pinned = new Set(input.policy.pinnedComponentUids);
	const excluded = new Set(input.policy.excludedComponentUids);
	const cutoff = new Date(
		(input.now ?? new Date()).getTime() -
			input.policy.gracePeriodDays * 24 * 60 * 60 * 1000,
	);
	const included = new Set<string>();
	const reasons = {
		used: new Set<string>(),
		defaults: new Set<string>(),
		grace: new Set<string>(),
		pinned: new Set<string>(),
		route: new Set<string>(),
		dependencies: new Set<string>(),
	};

	for (const component of activeStandard) {
		const uid = component.uid as string;
		if ((component.metric?.selectionCount ?? 0) > 0) {
			included.add(uid);
			reasons.used.add(uid);
		}
		if (input.defaultComponentUids.has(uid)) {
			included.add(uid);
			reasons.defaults.add(uid);
		}
		if (createdWithin(component, cutoff)) {
			included.add(uid);
			reasons.grace.add(uid);
		}
		if (pinned.has(uid)) {
			included.add(uid);
			reasons.pinned.add(uid);
		}
	}

	// Keep one deterministic standard option for each configured step so an old,
	// unused family never becomes structurally empty.
	const byStep = new Map<number, SalesRequestCatalogCandidate[]>();
	for (const component of activeStandard) {
		const family = byStep.get(component.dykeStepId) ?? [];
		family.push(component);
		byStep.set(component.dykeStepId, family);
	}
	for (const family of byStep.values()) {
		const first = [...family].sort(compareCandidates)[0];
		if (first?.uid) {
			included.add(first.uid);
			reasons.route.add(first.uid);
		}
	}

	let changed = true;
	while (changed) {
		changed = false;
		for (const uid of [...included]) {
			const candidate = byUid.get(uid);
			if (!candidate) continue;
			for (const dependencyUid of visibilityDependencies(candidate)) {
				if (!byUid.has(dependencyUid)) {
					// The canonical projector removes an `is` branch whose dependency is
					// deleted/custom-only and makes an empty `isNot` branch unrestricted.
					// Do not resurrect that unavailable historical component here.
					continue;
				}
				if (!included.has(dependencyUid)) {
					included.add(dependencyUid);
					reasons.dependencies.add(dependencyUid);
					changed = true;
				}
			}
		}
	}

	for (const uid of excluded) {
		if (
			input.defaultComponentUids.has(uid) ||
			reasons.dependencies.has(uid) ||
			reasons.route.has(uid)
		) {
			throw new Error(
				`Sales request catalog exclusion would remove required component ${uid}`,
			);
		}
		included.delete(uid);
	}

	const selected = activeStandard.filter(
		(component) => component.uid && included.has(component.uid),
	);
	const diagnostics: SalesRequestCatalogDiagnostics = {
		totalActiveRows: input.components.length,
		totalActiveStandardRows: activeStandard.length,
		excludedCustom: input.components.length - activeStandard.length,
		excludedUnused: Math.max(
			0,
			activeStandard.length -
				selected.length -
				[...excluded].filter((uid) => byUid.has(uid)).length,
		),
		usedInclusions: reasons.used.size,
		defaultInclusions: reasons.defaults.size,
		gracePeriodInclusions: reasons.grace.size,
		pinnedInclusions: reasons.pinned.size,
		dependencyClosureAdditions: reasons.dependencies.size,
		routeNecessityInclusions: reasons.route.size,
		explicitExclusions: [...excluded].filter((uid) => byUid.has(uid)).length,
		unreachableExclusions: 0,
		finalTupleCount: selected.length,
	};
	return { components: selected, diagnostics };
}
