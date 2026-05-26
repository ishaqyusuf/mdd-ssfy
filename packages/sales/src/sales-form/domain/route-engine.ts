import {
	customNextStepTitle,
	findStepByTitle,
	normalizeSalesFormTitle,
	stepMatches,
} from "./step-engine";

const DEFAULT_AUTO_ADVANCE_TITLES = new Set([
	"height",
	"width",
	"hand",
	"door",
	"house package tool",
]);

type SelectedComponent = {
	uid: string;
	title?: string | null;
	redirectUid?: string | null;
	id?: number | null;
	img?: string | null;
};

function clearRedirectDisabledMeta(step: any) {
	const meta = step?.meta || {};
	return {
		...step,
		meta: {
			...meta,
			redirectDisabled: false,
			redirectTargetUid: null,
		},
	};
}

function markRedirectDisabled(step: any, redirectTargetUid: string) {
	return {
		...step,
		meta: {
			...(step?.meta || {}),
			redirectDisabled: true,
			redirectTargetUid,
		},
	};
}

export function seedRouteStep(
	step: any,
	selectedComponent?: SelectedComponent,
) {
	return {
		id: null,
		stepId: step.id,
		componentId: selectedComponent?.id || null,
		prodUid: selectedComponent?.uid || "",
		value: selectedComponent?.title || "",
		meta: {
			...(step?.meta &&
			typeof step.meta === "object" &&
			!Array.isArray(step.meta)
				? step.meta
				: {}),
			...(selectedComponent?.img
				? {
						img: selectedComponent.img,
					}
				: {}),
		},
		step: {
			id: step.id,
			uid: step.uid,
			title: step.title || "",
		},
	};
}

export function buildConfiguredRouteSteps(
	routeData: any,
	rootStep: any,
	selectedComponent: SelectedComponent,
) {
	const initial = [seedRouteStep(rootStep, selectedComponent)];
	const route = routeData?.composedRouter?.[selectedComponent?.uid];
	const sequenceUids: string[] = Array.isArray(route?.routeSequence)
		? route.routeSequence
				.map((entry: any) => String(entry?.uid || ""))
				.filter(Boolean)
		: [];
	if (!sequenceUids.length) return initial;

	const deduped = Array.from(new Set(sequenceUids));
	const routeSteps = deduped
		.map((uid) => routeData?.stepsByUid?.[uid])
		.filter(Boolean)
		.map((step) => seedRouteStep(step));
	return [...initial, ...routeSteps];
}

export function mergeConfiguredSeriesWithExisting(
	existingSteps: any[],
	configuredSteps: any[],
) {
	return configuredSteps.map((seriesStep, index) => {
		if (index === 0) return seriesStep;
		const routeUid = seriesStep?.step?.uid;
		const routeId = seriesStep?.stepId;
		const existing = existingSteps.find(
			(step) =>
				(routeUid && step?.step?.uid === routeUid) ||
				(routeId != null && step?.stepId === routeId),
		);
		if (!existing) return seriesStep;
		return {
			...seriesStep,
			...existing,
			prodUid: safeString(existing?.prodUid)
				? existing.prodUid
				: seriesStep?.prodUid,
			componentId: existing?.componentId ?? seriesStep?.componentId ?? null,
			value: safeString(existing?.value) ? existing.value : seriesStep?.value,
			meta: {
				...(seriesStep?.meta || {}),
				...(existing?.meta || {}),
			},
			stepId: seriesStep.stepId ?? existing.stepId ?? null,
			step: {
				...(existing.step || {}),
				...(seriesStep.step || {}),
			},
		};
	});
}

function safeString(value: any) {
	return String(value || "").trim();
}

function getStepUid(routeData: any, step: any) {
	return (
		safeString(step?.step?.uid) ||
		safeString(step?.uid) ||
		safeString(step?.stepUid) ||
		routeData?.stepsById?.[step?.stepId || -1] ||
		routeData?.stepsById?.[step?.step?.id || -1] ||
		null
	);
}

function getRouteSteps(routeData: any) {
	return Object.values(routeData?.stepsByUid || {}).filter(Boolean) as any[];
}

function getConfiguredRootComponentUids(routeData: any) {
	return new Set(
		Object.keys(routeData?.composedRouter || {})
			.map((uid) => safeString(uid))
			.filter(Boolean),
	);
}

function routeStepHasConfiguredRootComponent(routeData: any, step: any) {
	const configured = getConfiguredRootComponentUids(routeData);
	if (!configured.size) return false;
	return (step?.components || []).some((component: any) =>
		configured.has(safeString(component?.uid)),
	);
}

function resolveRootRouteStep(routeData: any, preferredStep?: any) {
	const routeSteps = getRouteSteps(routeData);
	const rootUid = safeString(routeData?.rootStepUid);
	if (rootUid && routeData?.stepsByUid?.[rootUid]) {
		return routeData.stepsByUid[rootUid];
	}

	const configuredRootStep = routeSteps.find((step) =>
		routeStepHasConfiguredRootComponent(routeData, step),
	);
	if (configuredRootStep) return configuredRootStep;

	const preferredUid = getStepUid(routeData, preferredStep);
	if (preferredUid && routeData?.stepsByUid?.[preferredUid]) {
		return routeData.stepsByUid[preferredUid];
	}

	return (
		routeSteps.find(
			(step) => normalizeSalesFormTitle(step?.title) === "item type",
		) ||
		routeSteps.find((step) => Number(step?.id || 0) === 1) ||
		null
	);
}

function rootComponentsForStep(routeData: any, rootStep: any) {
	const rootStepComponents = Array.isArray(rootStep?.components)
		? rootStep.components
		: [];
	const components = rootStepComponents.length
		? rootStepComponents
		: Array.isArray(routeData?.rootComponents)
			? routeData.rootComponents
			: [];
	return components.filter((component: any) => safeString(component?.uid));
}

function selectedComponentUidCandidates(step: any) {
	const candidates = [
		step?.prodUid,
		step?.componentUid,
		step?.meta?.prodUid,
		step?.meta?.componentUid,
	];
	if (Array.isArray(step?.meta?.selectedComponents)) {
		step.meta.selectedComponents.forEach((component: any) => {
			candidates.push(component?.uid);
		});
	}
	return candidates.map(safeString).filter(Boolean);
}

function rootComponentTitleCandidates(step: any) {
	const candidates = [
		step?.value,
		step?.title,
		step?.step?.title,
		step?.item?.value,
		step?.item?.title,
		step?.meta?.value,
		step?.meta?.title,
	];
	if (Array.isArray(step?.meta?.selectedComponents)) {
		step.meta.selectedComponents.forEach((component: any) => {
			candidates.push(component?.title, component?.name, component?.value);
		});
	}
	return candidates
		.map((value) => normalizeSalesFormTitle(value))
		.filter(Boolean);
}

function rootSelectionScore(routeData: any, step: any, rootStep: any) {
	if (!step) return -1;
	const stepUid = getStepUid(routeData, step);
	const rootUid = safeString(rootStep?.uid);
	if (stepUid && rootUid && stepUid === rootUid) return 100;
	if (
		Number(rootStep?.id || 0) > 0 &&
		(Number(step?.stepId || 0) === Number(rootStep.id) ||
			Number(step?.step?.id || 0) === Number(rootStep.id))
	) {
		return 95;
	}
	if (normalizeSalesFormTitle(step?.step?.title) === "item type") return 90;
	if (normalizeSalesFormTitle(step?.title) === "item type") return 90;

	const configured = getConfiguredRootComponentUids(routeData);
	if (selectedComponentUidCandidates(step).some((uid) => configured.has(uid))) {
		return 80;
	}

	const rootComponents = rootComponentsForStep(routeData, rootStep);
	const componentId = Number(step?.componentId || step?.component?.id || 0);
	if (
		componentId > 0 &&
		rootComponents.some(
			(component: any) =>
				Number(component?.id || 0) === componentId &&
				configured.has(safeString(component?.uid)),
		)
	) {
		return 70;
	}

	const titleCandidates = new Set(rootComponentTitleCandidates(step));
	if (
		rootComponents.some(
			(component: any) =>
				configured.has(safeString(component?.uid)) &&
				titleCandidates.has(normalizeSalesFormTitle(component?.title)),
		)
	) {
		return 60;
	}

	return -1;
}

function getItemTypeStep(routeData: any, steps: any[], rootStep: any) {
	let bestStep: any = null;
	let bestScore = -1;
	steps.forEach((step) => {
		const score = rootSelectionScore(routeData, step, rootStep);
		if (score > bestScore) {
			bestStep = step;
			bestScore = score;
		}
	});
	return bestScore >= 0 ? bestStep : null;
}

function resolveSelectedRootComponent(
	routeData: any,
	rootStep: any,
	itemTypeStep: any,
): SelectedComponent | null {
	const configured = getConfiguredRootComponentUids(routeData);
	const rootComponents = rootComponentsForStep(routeData, rootStep);
	const byUid = new Map<string, any>(
		rootComponents.map((component: any) => [
			safeString(component?.uid),
			component,
		]),
	);

	for (const uid of selectedComponentUidCandidates(itemTypeStep)) {
		if (!configured.has(uid)) continue;
		const component = byUid.get(uid) || {};
		return {
			uid,
			title:
				itemTypeStep?.value || component?.title || itemTypeStep?.title || null,
			id: itemTypeStep?.componentId || component?.id || null,
			img: itemTypeStep?.meta?.img || component?.img || null,
		};
	}

	const componentId = Number(
		itemTypeStep?.componentId || itemTypeStep?.component?.id || 0,
	);
	if (componentId > 0) {
		const component = rootComponents.find(
			(candidate: any) =>
				Number(candidate?.id || 0) === componentId &&
				configured.has(safeString(candidate?.uid)),
		);
		if (component) {
			return {
				uid: safeString(component.uid),
				title: itemTypeStep?.value || component?.title || null,
				id: componentId,
				img: itemTypeStep?.meta?.img || component?.img || null,
			};
		}
	}

	const titleCandidates = new Set(rootComponentTitleCandidates(itemTypeStep));
	const component = rootComponents.find(
		(candidate: any) =>
			configured.has(safeString(candidate?.uid)) &&
			titleCandidates.has(normalizeSalesFormTitle(candidate?.title)),
	);
	if (!component) return null;
	return {
		uid: safeString(component.uid),
		title: itemTypeStep?.value || component?.title || null,
		id: itemTypeStep?.componentId || component?.id || null,
		img: itemTypeStep?.meta?.img || component?.img || null,
	};
}

function mergeConfiguredStepWithExisting(seriesStep: any, existing: any) {
	if (!existing) return seriesStep;
	return {
		...seriesStep,
		...existing,
		prodUid: safeString(existing?.prodUid)
			? existing.prodUid
			: seriesStep?.prodUid,
		componentId: existing?.componentId ?? seriesStep?.componentId ?? null,
		value: safeString(existing?.value) ? existing.value : seriesStep?.value,
		meta: {
			...(seriesStep?.meta || {}),
			...(existing?.meta || {}),
		},
		stepId: seriesStep.stepId ?? existing.stepId ?? null,
		step: {
			...(existing.step || {}),
			...(seriesStep.step || {}),
		},
	};
}

export function resolveConfiguredRouteStepsForLine({
	routeData,
	line,
}: {
	routeData: any;
	line: { formSteps?: any[] | null };
}) {
	const existingSteps = Array.isArray(line?.formSteps) ? line.formSteps : [];
	if (!routeData || !existingSteps.length) return existingSteps;

	const rootStep = resolveRootRouteStep(routeData);
	if (!rootStep) return existingSteps;

	const itemTypeStep = getItemTypeStep(routeData, existingSteps, rootStep);
	if (!itemTypeStep) return existingSteps;

	const rootComponent = resolveSelectedRootComponent(
		routeData,
		rootStep,
		itemTypeStep,
	);
	if (!rootComponent) {
		return [
			mergeConfiguredStepWithExisting(seedRouteStep(rootStep), itemTypeStep),
		];
	}

	const configuredSteps = buildConfiguredRouteSteps(routeData, rootStep, {
		uid: rootComponent.uid,
		title: rootComponent.title || itemTypeStep?.value || null,
		id: rootComponent.id || null,
		img: rootComponent.img || null,
	});

	return configuredSteps.map((seriesStep) => {
		const routeUid = seriesStep?.step?.uid;
		const routeId = seriesStep?.stepId;
		const existing = existingSteps.find(
			(step) =>
				(routeUid && getStepUid(routeData, step) === routeUid) ||
				(routeId != null && step?.stepId === routeId),
		);
		return mergeConfiguredStepWithExisting(seriesStep, existing);
	});
}

function configuredSeriesFromRootSelection(routeData: any, steps: any[]) {
	const rootStep = resolveRootRouteStep(routeData, steps[0]);
	if (!rootStep) return null;

	const rootSelection = getItemTypeStep(routeData, steps, rootStep);
	if (!rootSelection) return null;

	const rootComponent = resolveSelectedRootComponent(
		routeData,
		rootStep,
		rootSelection,
	);
	if (!rootComponent) return null;

	const route = routeData?.composedRouter?.[rootComponent.uid];
	if (!Array.isArray(route?.routeSequence) || !route.routeSequence.length) {
		return null;
	}

	const configuredSteps = buildConfiguredRouteSteps(
		routeData,
		rootStep,
		rootComponent,
	);

	return mergeConfiguredSeriesWithExisting(steps, configuredSteps);
}

export function resolveNextStep({
	routeData,
	line,
	steps,
	currentStepIndex,
	selectedComponent,
	allowPriorFallback = true,
	allowCustomFallback = true,
}: {
	routeData: any;
	line: any;
	steps: any[];
	currentStepIndex: number;
	selectedComponent: SelectedComponent;
	allowPriorFallback?: boolean;
	allowCustomFallback?: boolean;
}) {
	if (!routeData || !steps[currentStepIndex]) return null;

	const currentStep = steps[currentStepIndex];
	const rootComponentUid = steps[0]?.prodUid;
	const rootRoute = rootComponentUid
		? routeData.composedRouter?.[rootComponentUid]
		: null;

	const currentStepUid =
		currentStep.step?.uid || routeData.stepsById?.[currentStep.stepId || -1];

	let nextStep: any = selectedComponent.redirectUid
		? routeData.stepsByUid?.[selectedComponent.redirectUid]
		: null;

	if (!nextStep && currentStepUid && rootRoute) {
		const nextUid = rootRoute.route?.[currentStepUid];
		if (nextUid) nextStep = routeData.stepsByUid?.[nextUid];
	}

	if (!nextStep && allowPriorFallback && rootRoute?.route) {
		for (let i = currentStepIndex; i >= 0; i--) {
			const priorStep = steps[i];
			const priorUid =
				priorStep?.step?.uid || routeData.stepsById?.[priorStep?.stepId || -1];
			if (!priorUid) continue;
			const fallbackUid = rootRoute.route?.[priorUid];
			if (!fallbackUid) continue;
			if (fallbackUid === currentStepUid) continue;
			const fallbackStep = routeData.stepsByUid?.[fallbackUid];
			if (fallbackStep) {
				nextStep = fallbackStep;
				break;
			}
		}
	}

	if (!nextStep && allowCustomFallback) {
		const customTitle = customNextStepTitle(
			(line.meta as any)?.doorType || null,
			currentStep.step?.title,
			selectedComponent.title || currentStep.value,
		);
		nextStep = findStepByTitle(routeData, customTitle);
	}

	return nextStep || null;
}

export function applyRouteRecursion({
	routeData,
	line,
	steps,
	startIndex,
	selectedComponent,
	autoAdvanceTitles = DEFAULT_AUTO_ADVANCE_TITLES,
	maxIterations = 12,
}: {
	routeData: any;
	line: any;
	steps: any[];
	startIndex: number;
	selectedComponent: SelectedComponent;
	autoAdvanceTitles?: Set<string>;
	maxIterations?: number;
}) {
	const nextSteps = [...steps];
	let currentIndex = startIndex;
	let currentComponent = selectedComponent;
	let onRedirectPath = false;
	const visited = new Set<string>();

	for (let i = 0; i < maxIterations; i++) {
		const redirectedThisHop = Boolean(currentComponent?.redirectUid);
		const nextStep = resolveNextStep({
			routeData,
			line,
			steps: nextSteps,
			currentStepIndex: currentIndex,
			selectedComponent: currentComponent,
			allowPriorFallback: !onRedirectPath,
			allowCustomFallback: !onRedirectPath,
		});

		if (!nextStep) break;
		if (visited.has(nextStep.uid)) break;
		visited.add(nextStep.uid);

		const existingIndex = nextSteps.findIndex((step) =>
			stepMatches(routeData, step, nextStep),
		);
		if (existingIndex >= 0) {
			currentIndex = existingIndex;
			break;
		}

		const routeStep = routeData?.stepsByUid?.[nextStep.uid];
		const candidates = (routeStep?.components || []).filter(
			(component: any) => !!component.uid,
		);
		const hiddenAuto = autoAdvanceTitles.has(
			normalizeSalesFormTitle(nextStep.title),
		);

		if (!candidates.length) {
			const virtualSteps = [...nextSteps, seedRouteStep(nextStep)];
			const virtualNext = resolveNextStep({
				routeData,
				line,
				steps: virtualSteps,
				currentStepIndex: virtualSteps.length - 1,
				selectedComponent: {
					uid: "",
					title: nextStep.title,
				},
			});
			if (!virtualNext) break;
			if (visited.has(virtualNext.uid)) break;
			nextSteps.push(seedRouteStep(nextStep));
			currentIndex = nextSteps.length - 1;
			currentComponent = {
				uid: "",
				title: nextStep.title,
			};
			continue;
		}

		if (candidates.length === 1 || hiddenAuto) {
			const auto = candidates[0];
			nextSteps.push(seedRouteStep(nextStep, auto));
			currentIndex = nextSteps.length - 1;
			currentComponent = auto;
			onRedirectPath = onRedirectPath || redirectedThisHop;
			continue;
		}

		nextSteps.push(seedRouteStep(nextStep));
		currentIndex = nextSteps.length - 1;
		onRedirectPath = onRedirectPath || redirectedThisHop;
		break;
	}

	return {
		steps: nextSteps,
		activeIndex: currentIndex,
	};
}

export function rebuildStepsFromSelection({
	routeData,
	line,
	steps,
	startIndex,
	selectedComponent,
	autoAdvanceTitles = DEFAULT_AUTO_ADVANCE_TITLES,
	maxIterations = 12,
}: {
	routeData: any;
	line: any;
	steps: any[];
	startIndex: number;
	selectedComponent: SelectedComponent;
	autoAdvanceTitles?: Set<string>;
	maxIterations?: number;
}) {
	const sanitizedSteps = steps.map(clearRedirectDisabledMeta);
	const configuredSteps = configuredSeriesFromRootSelection(
		routeData,
		sanitizedSteps,
	);
	const routeSteps = configuredSteps || sanitizedSteps.slice(0, startIndex + 1);
	const existingSteps = configuredSteps || sanitizedSteps;
	const rebuilt = applyRouteRecursion({
		routeData,
		line,
		steps: routeSteps,
		startIndex,
		selectedComponent,
		autoAdvanceTitles,
		maxIterations,
	});

	const merged = rebuilt.steps.map((step, index) => {
		if (index <= startIndex) return step;
		const existing = existingSteps.find((candidate) =>
			stepMatches(routeData, candidate, step?.step),
		);
		if (!existing) return step;
		return {
			...step,
			...existing,
			meta: {
				...(step?.meta || {}),
				...(existing?.meta || {}),
			},
			stepId: step.stepId ?? existing.stepId ?? null,
			step: {
				...(existing.step || {}),
				...(step.step || {}),
			},
		};
	});

	if (selectedComponent?.redirectUid) {
		const redirectStep = routeData?.stepsByUid?.[selectedComponent.redirectUid];
		const targetIndex = existingSteps.findIndex((candidate) =>
			stepMatches(routeData, candidate, redirectStep),
		);
		if (targetIndex > startIndex) {
			const redirectedSteps = existingSteps.map((step, index) => {
				if (index > startIndex && index < targetIndex) {
					return markRedirectDisabled(
						step,
						selectedComponent.redirectUid || "",
					);
				}
				return clearRedirectDisabledMeta(step);
			});
			return {
				steps: redirectedSteps,
				activeIndex: targetIndex,
			};
		}
	}

	const activeIndex =
		merged[rebuilt.activeIndex] != null
			? rebuilt.activeIndex
			: Math.max(0, merged.length - 1);

	return {
		steps: merged,
		activeIndex,
	};
}
