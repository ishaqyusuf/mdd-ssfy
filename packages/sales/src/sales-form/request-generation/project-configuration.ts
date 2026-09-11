import { isMultiSelectStepTitle } from "../ui/workflow/workflow-records";
import { projectRequestComponent } from "./component-projection";
import {
	type SalesRequestConfiguration,
	serializeSalesRequestConfiguration,
} from "./configuration-serializer";
import {
	type RequestConfigurationComponent,
	type RequestConfigurationDefaults,
	type RequestConfigurationRepository,
	type RequestConfigurationRootComponent,
	type RequestConfigurationSource,
	isRequestConfigurationStepCustom,
	loadRequestConfigurationSource,
} from "./load-configuration";

export type { RequestConfigurationDefaults } from "./load-configuration";

export type ProjectRequestConfigurationInput = {
	settingId: number;
	repository: RequestConfigurationRepository;
	defaults?: RequestConfigurationDefaults;
};

export type ProjectedRequestConfiguration = {
	configuration: SalesRequestConfiguration;
	configurationJson: string;
};

type ProjectedRoute = {
	itemTypeUid: string;
	rootStepUid: string;
	stepUids: string[];
	defaults?: Record<string, string>;
};

type ProjectedComponent = NonNullable<
	ReturnType<typeof projectRequestComponent>
>;

type ProjectedStep = {
	id: number;
	uid: string;
	title: string;
	custom?: true;
	selectionMode: "single" | "multiple";
	components: Array<{
		uid: string;
		title: string;
		sortIndex?: number | null;
	}>;
};

type ProjectedComponentRecord = {
	stepUid: string;
	component: ProjectedComponent;
};

function hasText(value: unknown): value is string {
	return typeof value === "string" && value.trim().length > 0;
}

function componentTitle(component: RequestConfigurationComponent) {
	for (const value of [
		component.name,
		component.product?.title,
		component.door?.title,
	]) {
		if (hasText(value)) return value.trim();
	}
	return null;
}

function projectComponent(
	component: RequestConfigurationComponent,
): ProjectedComponent | null {
	return projectRequestComponent(component);
}

function normalizeComponentDependencies(
	component: ProjectedComponent,
	allowedByStepUid: ReadonlyMap<string, ReadonlySet<string>>,
): ProjectedComponent | null {
	if (!component.variations.length) return component;
	const variations: ProjectedComponent["variations"] = [];
	for (const variation of component.variations) {
		const rules = variation.rules.flatMap((rule) => {
			const allowed = allowedByStepUid.get(rule.stepUid);
			if (!allowed) return [rule];
			const componentsUid = rule.componentsUid.filter((uid) =>
				allowed.has(uid),
			);
			if (rule.operator === "is" && componentsUid.length === 0) return [];
			if (rule.operator === "isNot" && componentsUid.length === 0) return [];
			return [{ ...rule, componentsUid }];
		});
		const impossible = variation.rules.some(
			(rule) =>
				rule.operator === "is" &&
				allowedByStepUid.has(rule.stepUid) &&
				!rule.componentsUid.some((uid) =>
					allowedByStepUid.get(rule.stepUid)?.has(uid),
				),
		);
		if (impossible) continue;
		// Variations are OR branches. If one branch becomes an empty conjunction
		// after removing an impossible isNot dependency, that branch is always true.
		if (rules.length === 0) return { ...component, variations: [] };
		variations.push({ rules });
	}
	return variations.length ? { ...component, variations } : null;
}

function assertStepIdentity(
	step: {
		id: number;
		uid: string | null;
		title: string | null;
		meta?: unknown;
	},
	label: string,
): asserts step is {
	id: number;
	uid: string;
	title: string;
	meta?: unknown;
} {
	if (!Number.isSafeInteger(step.id) || step.id <= 0) {
		throw new Error(`Invalid configured step ID: ${label}`);
	}
	if (!hasText(step.uid)) {
		throw new Error(`Missing configured step UID: ${label}`);
	}
	if (!hasText(step.title)) {
		throw new Error(`Missing configured step title: ${step.uid}`);
	}
}

function assertRootIdentity(root: RequestConfigurationRootComponent) {
	if (!hasText(root.uid)) {
		throw new Error("Missing configured root component UID");
	}
	if (!hasText(componentTitle(root))) {
		throw new Error(`Missing configured root component title: ${root.uid}`);
	}
	assertStepIdentity(root.step, `root component ${root.uid}`);
}

function sameRootStep(
	left: RequestConfigurationRootComponent["step"],
	right: RequestConfigurationRootComponent["step"],
) {
	return (
		left.id === right.id && left.uid === right.uid && left.title === right.title
	);
}

function rootStepFromSource(source: RequestConfigurationSource) {
	const first = source.rootComponents[0]?.step;
	if (!first) {
		if (source.routes.length) {
			throw new Error("Configured routes have no root step identity");
		}
		return null;
	}

	assertStepIdentity(first, "configured root");
	for (const root of source.rootComponents.slice(1)) {
		assertStepIdentity(root.step, `root component ${root.uid}`);
		if (!sameRootStep(first, root.step)) {
			throw new Error(
				"Configured root components resolve to different root steps",
			);
		}
	}
	return first;
}

function addProjectedComponent(
	byUid: Map<string, ProjectedComponentRecord>,
	stepUid: string,
	component: ProjectedComponent,
) {
	const previous = byUid.get(component.uid);
	if (previous) {
		throw new Error(`Duplicate configured component UID: ${component.uid}`);
	}
	byUid.set(component.uid, { stepUid, component });
}

function projectRootComponents(
	source: RequestConfigurationSource,
	rootStepUid: string | null,
	byUid: Map<string, ProjectedComponentRecord>,
	allowedByStepUid: ReadonlyMap<string, ReadonlySet<string>>,
) {
	const projected: ProjectedComponent[] = [];
	for (const root of source.rootComponents) {
		assertRootIdentity(root);
		const projectedComponent = projectComponent(root);
		const component = projectedComponent
			? normalizeComponentDependencies(projectedComponent, allowedByStepUid)
			: null;
		if (!component) {
			throw new Error(
				`Configured root component is deleted or unavailable: ${root.uid}`,
			);
		}
		if (!rootStepUid) {
			throw new Error(
				`Configured root component has no root step: ${root.uid}`,
			);
		}
		addProjectedComponent(byUid, rootStepUid, component);
		projected.push(component);
	}
	return projected;
}

function projectStepComponents(
	source: RequestConfigurationSource,
	stepById: Map<number, { uid: string | null; title: string | null }>,
	byUid: Map<string, ProjectedComponentRecord>,
	allowedByStepUid: ReadonlyMap<string, ReadonlySet<string>>,
) {
	const componentsByStepUid = new Map<string, ProjectedComponent[]>();

	for (const component of source.components) {
		const step = stepById.get(component.dykeStepId);
		if (!step || !hasText(step.uid)) {
			throw new Error(
				`Component ${String(component.uid || "")} references an unavailable step ID: ${component.dykeStepId}`,
			);
		}
		const rawProjected = projectComponent(component);
		const projected = rawProjected
			? normalizeComponentDependencies(rawProjected, allowedByStepUid)
			: null;
		if (!projected) continue;
		addProjectedComponent(byUid, step.uid, projected);
		const components = componentsByStepUid.get(step.uid) ?? [];
		components.push(projected);
		componentsByStepUid.set(step.uid, components);
	}

	return componentsByStepUid;
}

function assertComponentRules(
	componentRecords: readonly ProjectedComponentRecord[],
	stepUids: ReadonlySet<string>,
	componentUidsByStepUid: ReadonlyMap<string, ReadonlySet<string>>,
) {
	for (const { stepUid: ownerStepUid, component } of componentRecords) {
		if (component.redirectUid && !stepUids.has(component.redirectUid)) {
			throw new Error(
				`Dangling redirect step UID ${component.redirectUid} on component ${component.uid}`,
			);
		}

		for (const variation of component.variations) {
			for (const rule of variation.rules) {
				if (!stepUids.has(rule.stepUid)) {
					throw new Error(
						`Dangling visibility step UID ${rule.stepUid} on component ${component.uid}`,
					);
				}
				const allowedComponents = componentUidsByStepUid.get(rule.stepUid);
				if (!allowedComponents) {
					throw new Error(
						`Missing visibility step ${rule.stepUid} on component ${component.uid}`,
					);
				}
				for (const dependencyUid of rule.componentsUid) {
					if (!allowedComponents.has(dependencyUid)) {
						throw new Error(
							`Dangling visibility component UID ${dependencyUid} for step ${rule.stepUid} on component ${component.uid}`,
						);
					}
				}
			}
		}

		if (!componentUidsByStepUid.get(ownerStepUid)?.has(component.uid)) {
			throw new Error(`Component ${component.uid} is not scoped to its step`);
		}
	}
}

function buildVisibilityMetadata(
	componentRecords: readonly ProjectedComponentRecord[],
) {
	const visibilityByComponentUid: Record<string, unknown> = {};
	for (const { component } of componentRecords) {
		const visibility: Record<string, unknown> = {};
		if (component.variations.length) {
			visibility.variations = component.variations;
		}
		if (component.redirectUid) visibility.redirectUid = component.redirectUid;
		if (
			component.sectionOverride !== undefined &&
			Object.keys(component.sectionOverride).length
		) {
			visibility.sectionOverride = component.sectionOverride;
		}
		if (Object.keys(visibility).length) {
			visibilityByComponentUid[component.uid] = visibility;
		}
	}
	return visibilityByComponentUid;
}

function snapshotComponent(component: ProjectedComponent) {
	return {
		uid: component.uid,
		title: component.title,
		...(component.sortIndex == null ? {} : { sortIndex: component.sortIndex }),
	};
}

function normalizeRouteDefaults(
	defaults: RequestConfigurationDefaults | undefined,
	routes: ProjectedRoute[],
	componentUidsByStepUid: ReadonlyMap<string, ReadonlySet<string>>,
) {
	if (!defaults) return new Map<string, Record<string, string>>();

	const routeByItemTypeUid = new Map(
		routes.map((route) => [route.itemTypeUid, route]),
	);
	for (const itemTypeUid of Object.keys(defaults)) {
		if (!routeByItemTypeUid.has(itemTypeUid)) {
			throw new Error(`Default references unknown route: ${itemTypeUid}`);
		}
	}

	const normalized = new Map<string, Record<string, string>>();
	for (const route of routes) {
		const routeDefaults = defaults[route.itemTypeUid];
		if (!routeDefaults) continue;
		const allowedStepUids = new Set(route.stepUids);
		const values: Record<string, string> = {};
		for (const [stepUid, componentUid] of Object.entries(routeDefaults)) {
			if (!allowedStepUids.has(stepUid)) {
				throw new Error(
					`Default step ${stepUid} is not in route ${route.itemTypeUid}`,
				);
			}
			if (!hasText(componentUid)) {
				throw new Error(
					`Default component for ${route.itemTypeUid}/${stepUid} must be a UID`,
				);
			}
			if (!componentUidsByStepUid.get(stepUid)?.has(componentUid)) {
				throw new Error(
					`Default component ${componentUid} is not in step ${stepUid}`,
				);
			}
			values[stepUid] = componentUid;
		}
		if (Object.keys(values).length) normalized.set(route.itemTypeUid, values);
	}
	return normalized;
}

function buildSnapshotRoutes(
	source: RequestConfigurationSource,
	rootStepId: number | null,
	defaults: ReadonlyMap<string, Readonly<Record<string, string>>>,
) {
	return source.routes.map((route) => {
		const routeDefaults = defaults.get(route.itemTypeUid);
		return {
			itemTypeUid: route.itemTypeUid,
			rootStepId,
			stepUids: [...route.stepUids],
			...(route.config ? { config: { ...route.config } } : {}),
			...(routeDefaults ? { defaults: { ...routeDefaults } } : {}),
		};
	});
}

/** Compose a scoped source into the price-free model snapshot. */
export async function projectRequestConfiguration(
	input: ProjectRequestConfigurationInput,
): Promise<ProjectedRequestConfiguration> {
	const source = await loadRequestConfigurationSource(
		{ settingId: input.settingId },
		input.repository,
	);
	const rootStep = rootStepFromSource(source);
	const rootStepUid = rootStep?.uid ?? null;
	const rootStepId = rootStep?.id ?? null;

	const configuredSteps = new Map<string, { id: number; title: string }>();
	const configuredStepIds = new Map<number, string>();
	for (const step of source.steps) {
		assertStepIdentity(step, `configured ${step.uid}`);
		if (configuredSteps.has(step.uid)) {
			throw new Error(`Duplicate configured step UID: ${step.uid}`);
		}
		if (configuredStepIds.has(step.id)) {
			throw new Error(`Duplicate configured step ID: ${step.id}`);
		}
		configuredSteps.set(step.uid, { id: step.id, title: step.title });
		configuredStepIds.set(step.id, step.uid);
	}
	if (rootStep) {
		if (configuredSteps.has(rootStep.uid)) {
			throw new Error(`Duplicate configured step UID: ${rootStep.uid}`);
		}
		if (configuredStepIds.has(rootStep.id)) {
			throw new Error(`Duplicate configured step ID: ${rootStep.id}`);
		}
		configuredSteps.set(rootStep.uid, {
			id: rootStep.id,
			title: rootStep.title,
		});
		configuredStepIds.set(rootStep.id, rootStep.uid);
	}
	const stepById = new Map(
		source.steps.map((step) => [step.id, { uid: step.uid, title: step.title }]),
	);
	const candidateComponentUidsByStepUid = new Map<string, Set<string>>();
	if (rootStepUid) {
		candidateComponentUidsByStepUid.set(
			rootStepUid,
			new Set(
				source.rootComponents.flatMap((component) =>
					component.uid ? [component.uid] : [],
				),
			),
		);
	}
	for (const component of source.components) {
		const stepUid = stepById.get(component.dykeStepId)?.uid;
		if (!stepUid || !component.uid) continue;
		const candidates =
			candidateComponentUidsByStepUid.get(stepUid) ?? new Set<string>();
		candidates.add(component.uid);
		candidateComponentUidsByStepUid.set(stepUid, candidates);
	}

	const projectedByComponentUid = new Map<string, ProjectedComponentRecord>();
	const projectedRootComponents = projectRootComponents(
		source,
		rootStepUid,
		projectedByComponentUid,
		candidateComponentUidsByStepUid,
	);
	const projectedComponentsByStepUid = projectStepComponents(
		source,
		stepById,
		projectedByComponentUid,
		candidateComponentUidsByStepUid,
	);

	const componentUidsByStepUid = new Map<string, ReadonlySet<string>>();
	if (rootStepUid) {
		componentUidsByStepUid.set(
			rootStepUid,
			new Set(projectedRootComponents.map((component) => component.uid)),
		);
	}
	for (const [stepUid, components] of projectedComponentsByStepUid) {
		componentUidsByStepUid.set(
			stepUid,
			new Set(components.map((component) => component.uid)),
		);
	}

	const allStepUids = new Set(configuredSteps.keys());
	assertComponentRules(
		[...projectedByComponentUid.values()],
		allStepUids,
		componentUidsByStepUid,
	);

	const projectedSteps: ProjectedStep[] = [];
	if (rootStepUid && rootStep) {
		projectedSteps.push({
			id: rootStep.id,
			uid: rootStepUid,
			title: rootStep.title,
			...(isRequestConfigurationStepCustom(rootStep.meta)
				? { custom: true as const }
				: {}),
			selectionMode: isMultiSelectStepTitle(rootStep.title)
				? "multiple"
				: "single",
			components: projectedRootComponents.map(snapshotComponent),
		});
	}
	for (const step of source.steps) {
		if (!step.uid || !step.title) continue;
		projectedSteps.push({
			id: step.id,
			uid: step.uid,
			title: step.title,
			...(isRequestConfigurationStepCustom(step.meta)
				? { custom: true as const }
				: {}),
			selectionMode: isMultiSelectStepTitle(step.title) ? "multiple" : "single",
			components: (projectedComponentsByStepUid.get(step.uid) ?? []).map(
				snapshotComponent,
			),
		});
	}

	const projectedRoutes: ProjectedRoute[] = source.routes.map((route) => {
		if (!rootStepUid) {
			throw new Error(`Route ${route.itemTypeUid} has no root step`);
		}
		for (const stepUid of route.stepUids) {
			if (!configuredSteps.has(stepUid)) {
				throw new Error(
					`Route ${route.itemTypeUid} references unavailable step UID: ${stepUid}`,
				);
			}
		}
		return {
			itemTypeUid: route.itemTypeUid,
			rootStepUid,
			stepUids: [...route.stepUids],
		};
	});
	const normalizedDefaults = normalizeRouteDefaults(
		input.defaults ?? source.defaults,
		projectedRoutes,
		componentUidsByStepUid,
	);
	for (const route of projectedRoutes) {
		const defaults = normalizedDefaults.get(route.itemTypeUid);
		if (defaults) route.defaults = defaults;
	}
	const configuration: SalesRequestConfiguration = {
		schemaVersion: 1,
		routes: buildSnapshotRoutes(source, rootStepId, normalizedDefaults),
		steps: projectedSteps,
		visibilityByComponentUid: buildVisibilityMetadata([
			...projectedByComponentUid.values(),
		]),
	};

	return {
		configuration,
		configurationJson: serializeSalesRequestConfiguration(configuration),
	};
}
