import {
	type ConfiguredRequestRoute,
	getConfiguredRequestRoutes,
	getConfiguredRequestStepUids,
	resolveConfiguredRequestSteps,
} from "./configured-routes";

export type RequestConfigurationSetting = {
	id: number;
	meta: unknown;
};

export type RequestConfigurationDefaults = Readonly<
	Record<string, Readonly<Record<string, string>>>
>;

export type RequestConfigurationStep = {
	id: number;
	uid: string | null;
	title: string | null;
	meta?: unknown;
};

export type RequestConfigurationComponent = {
	id: number;
	uid: string | null;
	name: string | null;
	meta: unknown;
	redirectUid: string | null;
	custom?: boolean | null;
	sortIndex?: number | null;
	dykeStepId: number;
	product?: { title: string | null } | null;
	door?: { title: string | null } | null;
};

export type RequestConfigurationRootComponent =
	RequestConfigurationComponent & {
		step: RequestConfigurationStep;
	};

export type RequestConfigurationRepository = {
	getSetting: (
		settingId: number,
	) => Promise<RequestConfigurationSetting | null | undefined>;
	getStepsByUids: (
		stepUids: readonly string[],
	) => Promise<readonly RequestConfigurationStep[]>;
	getRootComponentsByUids: (
		componentUids: readonly string[],
	) => Promise<readonly RequestConfigurationRootComponent[]>;
	getComponentsByStepIds: (
		stepIds: readonly number[],
	) => Promise<readonly RequestConfigurationComponent[]>;
};

export type RequestConfigurationSource = {
	routes: ConfiguredRequestRoute[];
	steps: RequestConfigurationStep[];
	rootComponents: RequestConfigurationRootComponent[];
	components: RequestConfigurationComponent[];
	defaults?: RequestConfigurationDefaults;
};

function hasText(value: unknown): value is string {
	return typeof value === "string" && value.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return !!value && typeof value === "object" && !Array.isArray(value);
}

/**
 * Read the step-level custom capability from the authoritative DykeSteps meta.
 * Malformed or empty metadata is treated as the capability being disabled, as
 * the Sales Form does when it reads the same metadata.
 */
export function isRequestConfigurationStepCustom(meta: unknown): boolean {
	if (typeof meta === "string") {
		try {
			return isRequestConfigurationStepCustom(JSON.parse(meta));
		} catch {
			return false;
		}
	}
	return isRecord(meta) && meta.custom === true;
}

function strictRecord(value: unknown, label: string) {
	if (value == null) return {};
	if (typeof value === "string") {
		let parsed: unknown;
		try {
			parsed = JSON.parse(value);
		} catch {
			throw new Error(`Invalid sales settings ${label}`);
		}
		return strictRecord(parsed, label);
	}
	if (!isRecord(value)) throw new Error(`Invalid sales settings ${label}`);
	return value;
}

function assertRouteStructure(meta: unknown) {
	const settings = strictRecord(meta, "metadata");
	const direct = strictRecord(settings.route, "route");
	const nestedData = strictRecord(settings.data, "data");
	const routes = Object.keys(direct).length
		? direct
		: strictRecord(nestedData.route, "data.route");
	if (!Object.keys(routes).length) {
		throw new Error("Sales settings contain no configured routes");
	}

	for (const [itemTypeUid, routeDefinition] of Object.entries(routes)) {
		if (!hasText(itemTypeUid)) {
			throw new Error("Configured route has an empty root component UID");
		}
		const route = strictRecord(routeDefinition, `route ${itemTypeUid}`);
		if (!Array.isArray(route.routeSequence)) {
			throw new Error(
				`Invalid routeSequence for root component ${itemTypeUid}`,
			);
		}
		const stepUids = new Set<string>();
		for (const [index, entry] of route.routeSequence.entries()) {
			if (!isRecord(entry)) {
				throw new Error(`Invalid routeSequence entry ${itemTypeUid}[${index}]`);
			}
			// Existing settings use a final empty UID as a route terminator.
			if (entry.uid === "" && index === route.routeSequence.length - 1) {
				continue;
			}
			if (!hasText(entry.uid)) {
				throw new Error(`Invalid routeSequence entry ${itemTypeUid}[${index}]`);
			}
			const uid = entry.uid.trim();
			if (stepUids.has(uid)) {
				throw new Error(
					`Duplicate routeSequence step UID ${uid} for root component ${itemTypeUid}`,
				);
			}
			stepUids.add(uid);
		}
		if (!stepUids.size) {
			throw new Error(
				`Invalid routeSequence for root component ${itemTypeUid}: no configured steps`,
			);
		}
	}
}

function readConfiguredRequestDefaults(
	meta: unknown,
	routes: readonly ConfiguredRequestRoute[],
): RequestConfigurationDefaults | undefined {
	const settings = strictRecord(meta, "metadata");
	const direct = strictRecord(settings.route, "route");
	const nestedData = strictRecord(settings.data, "data");
	const routeDefinitions = Object.keys(direct).length
		? direct
		: strictRecord(nestedData.route, "data.route");
	const configuredRouteUids = new Set(routes.map((route) => route.itemTypeUid));
	const defaults: Record<string, Record<string, string>> = {};

	for (const route of routes) {
		const routeDefinition = strictRecord(
			routeDefinitions[route.itemTypeUid],
			`route ${route.itemTypeUid}`,
		);
		const requestGeneration = strictRecord(
			routeDefinition.requestGeneration,
			`route ${route.itemTypeUid}.requestGeneration`,
		);
		const stored = requestGeneration.defaults;
		if (stored == null) continue;
		if (!isRecord(stored)) {
			throw new Error(
				`Invalid request-generation defaults for route ${route.itemTypeUid}`,
			);
		}

		const routeDefaults: Record<string, string> = {};
		for (const [stepUid, componentUid] of Object.entries(stored)) {
			if (componentUid === null) continue;
			if (!hasText(componentUid)) {
				throw new Error(
					`Invalid request-generation default for ${route.itemTypeUid}/${stepUid}`,
				);
			}
			routeDefaults[stepUid] = componentUid.trim();
		}
		if (Object.keys(routeDefaults).length) {
			defaults[route.itemTypeUid] = routeDefaults;
		}
	}

	for (const routeUid of Object.keys(routeDefinitions)) {
		if (!configuredRouteUids.has(routeUid)) {
			throw new Error(
				`Configured route disappeared while reading defaults: ${routeUid}`,
			);
		}
	}

	return Object.keys(defaults).length ? defaults : undefined;
}

function componentTitle(component: RequestConfigurationRootComponent) {
	for (const value of [
		component.name,
		component.product?.title,
		component.door?.title,
	]) {
		if (hasText(value)) return value.trim();
	}
	return null;
}

function assertRootIdentity(component: RequestConfigurationRootComponent) {
	const uid = component.uid;
	if (!hasText(uid) || !hasText(componentTitle(component))) {
		throw new Error(
			`Invalid configured root component identity: ${String(uid || "")}`,
		);
	}

	const step = component.step;
	if (
		!step ||
		!Number.isSafeInteger(step.id) ||
		step.id <= 0 ||
		!hasText(step.uid) ||
		!hasText(step.title)
	) {
		throw new Error(
			`Invalid configured root component identity: ${uid}; expected root step UID, ID, and title`,
		);
	}
}

function unique(values: readonly string[]) {
	return [...new Set(values)];
}

function requireValidSettingId(value: unknown): asserts value is number {
	if (!Number.isSafeInteger(value) || (value as number) <= 0) {
		throw new Error("A valid sales settings ID is required");
	}
}

/**
 * Load only the settings-derived route steps and their component families.
 * The repository owns authorization and active-row filtering; this boundary
 * deliberately has no provider, cache, invalidation, or Prisma dependency.
 */
export async function loadRequestConfigurationSource(
	input: { settingId: number },
	repository: RequestConfigurationRepository,
): Promise<RequestConfigurationSource> {
	const settingId = input?.settingId;
	requireValidSettingId(settingId);

	const setting = await repository.getSetting(settingId);
	if (!setting) throw new Error(`Sales settings not found: ${settingId}`);
	if (setting.id !== settingId) {
		throw new Error(`Sales settings identity mismatch: ${settingId}`);
	}

	assertRouteStructure(setting.meta);
	const routes = getConfiguredRequestRoutes(setting.meta);
	const defaults = readConfiguredRequestDefaults(setting.meta, routes);
	const rootComponentUids = unique(routes.map((route) => route.itemTypeUid));
	if (rootComponentUids.some((uid) => !hasText(uid))) {
		throw new Error("Configured route has an empty root component UID");
	}

	const configuredStepUids = getConfiguredRequestStepUids(routes);
	const stepCandidates = configuredStepUids.length
		? await repository.getStepsByUids(configuredStepUids)
		: [];
	// Resolve every configured step before fetching any component family using
	// the same deterministic duplicate-UID authority as the New Sales Form.
	const steps = resolveConfiguredRequestSteps(configuredStepUids, [
		...stepCandidates,
	]);

	const rootCandidates = rootComponentUids.length
		? await repository.getRootComponentsByUids(rootComponentUids)
		: [];
	const rootComponents = rootComponentUids.map((uid) => {
		const matches = rootCandidates.filter((component) => component.uid === uid);
		if (!matches.length) {
			throw new Error(`Missing configured root component UID: ${uid}`);
		}
		if (matches.length > 1) {
			throw new Error(`Ambiguous configured root component UID: ${uid}`);
		}
		const component = matches[0];
		if (!component) {
			throw new Error(
				`Missing configured root component UID after validation: ${uid}`,
			);
		}
		assertRootIdentity(component);
		return component;
	});

	const stepIds = unique(steps.map((step) => String(step.id))).map(Number);
	const componentCandidates = stepIds.length
		? await repository.getComponentsByStepIds(stepIds)
		: [];
	const allowedStepIds = new Set(stepIds);
	const components = [...componentCandidates].filter(
		(component) =>
			allowedStepIds.has(component.dykeStepId) && component.custom !== true,
	);

	return {
		routes,
		steps,
		rootComponents,
		components,
		...(defaults ? { defaults } : {}),
	};
}
