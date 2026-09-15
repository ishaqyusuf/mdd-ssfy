import { createHash } from "node:crypto";
import {
	type SalesRequestCatalogDiagnostics,
	selectSalesRequestCatalogCandidates,
} from "@api/services/sales-request-catalog-eligibility";
import type {
	SalesRequestConfigurationArtifact,
	SalesRequestConfigurationCache,
} from "@gnd/cache/sales-request-configuration-cache";
import { isComponentVisibleByRules } from "@gnd/sales/sales-form/domain/step-engine";
import {
	type RequestConfigurationComponent,
	type RequestConfigurationRepository,
	type RequestConfigurationSetting,
	type RequestConfigurationStep,
	SALES_REQUEST_COMPONENT_COLUMNS,
	type SalesRequestConfiguration,
	type SalesRequestConfigurationComponent,
	type SalesRequestConfigurationStep,
	getConfiguredRequestRoutes,
	getConfiguredRequestStepUids,
	isRequestConfigurationStepCustom,
	loadRequestConfigurationSource,
	projectRequestConfiguration,
	serializeSalesRequestConfiguration,
} from "@gnd/sales/sales-form/request-generation";
import { salesRequestCatalogPolicySchema } from "@gnd/settings";

const stepSelect = { id: true, uid: true, title: true, meta: true } as const;
const componentSelect = {
	id: true,
	uid: true,
	name: true,
	deletedAt: true,
	meta: true,
	redirectUid: true,
	custom: true,
	isDefault: true,
	sortIndex: true,
	createdAt: true,
	dykeStepId: true,
	metric: { select: { selectionCount: true } },
	product: { select: { title: true } },
	door: { select: { title: true } },
} as const;

type ComponentQuery = {
	where: {
		uid?: { in: string[] };
		dykeStepId?: { in: number[] };
		deletedAt?: null;
		step: { deletedAt: null };
	};
	select: typeof componentSelect & { step?: { select: typeof stepSelect } };
};

export type ConfigurationDatabase = {
	settings: {
		findFirst: (args: {
			where: { id: number; type: string; deletedAt: null };
			select: { id: true; meta: true };
		}) => Promise<RequestConfigurationSetting | null>;
	};
	dykeSteps: {
		findMany: (args: {
			where: { uid: { in: string[] }; deletedAt: null };
			select: typeof stepSelect;
		}) => Promise<RequestConfigurationStep[]>;
	};
	dykeStepProducts: {
		findMany: (
			args: ComponentQuery,
		) => Promise<
			Array<RequestConfigurationComponent & { step?: RequestConfigurationStep }>
		>;
	};
};

export type SalesRequestConfigurationSnapshotOptions = {
	cache?: SalesRequestConfigurationCache;
};

type ConfigurationRepositoryWithDiagnostics = RequestConfigurationRepository & {
	getDiagnostics: () => SalesRequestCatalogDiagnostics | undefined;
};

/** Internal catalog query. The calling API must authorize catalog/settings access. */
export function createSalesRequestConfigurationRepository(
	db: ConfigurationDatabase,
): ConfigurationRepositoryWithDiagnostics {
	let loadedSetting: RequestConfigurationSetting | null | undefined;
	let loadedSteps: RequestConfigurationStep[] = [];
	let diagnostics: SalesRequestCatalogDiagnostics | undefined;
	return {
		getDiagnostics: () => diagnostics,
		getSetting: async (settingId) => {
			loadedSetting = await db.settings.findFirst({
				where: { id: settingId, type: "sales-settings", deletedAt: null },
				select: { id: true, meta: true },
			});
			return loadedSetting;
		},
		getStepsByUids: async (stepUids) => {
			loadedSteps = await db.dykeSteps.findMany({
				where: { uid: { in: [...stepUids] }, deletedAt: null },
				select: stepSelect,
			});
			return loadedSteps;
		},
		getRootComponentsByUids: async (componentUids) => {
			const components = await db.dykeStepProducts.findMany({
				where: {
					uid: { in: [...componentUids] },
					deletedAt: null,
					step: { deletedAt: null },
				},
				select: { ...componentSelect, step: { select: stepSelect } },
			});
			return components.map((component) => {
				if (!component.step)
					throw new Error("Configured root component is missing its step");
				return { ...component, step: component.step };
			});
		},
		getComponentsByStepIds: async (stepIds) => {
			const components = await db.dykeStepProducts.findMany({
				where: {
					dykeStepId: { in: [...stepIds] },
					deletedAt: null,
					step: { deletedAt: null },
				},
				select: componentSelect,
			});
			const settingMeta = loadedSetting?.meta;
			const settings = readRecord(settingMeta) ?? {};
			const requestGeneration = readRecord(settings.requestGeneration) ?? {};
			const parsedPolicy = salesRequestCatalogPolicySchema.safeParse(
				requestGeneration.catalogPolicy,
			);
			const defaultComponentUids = new Set(
				components.flatMap((component) =>
					component.isDefault && component.uid ? [component.uid] : [],
				),
			);
			const selected = selectSalesRequestCatalogCandidates({
				components,
				includeUnused: true,
				defaultComponentUids,
				completeStepIds: new Set(
					loadedSteps
						.filter((step) =>
							/^(?:moulding|molding)s?$/i.test(String(step.title || "").trim()),
						)
						.map((step) => step.id),
				),
				policy: parsedPolicy.success
					? parsedPolicy.data
					: salesRequestCatalogPolicySchema.parse({}),
			});
			diagnostics = selected.diagnostics;
			return selected.components;
		},
	};
}

export function getSalesRequestConfigurationSource(
	db: ConfigurationDatabase,
	settingId: number,
) {
	return loadRequestConfigurationSource(
		{ settingId },
		createSalesRequestConfigurationRepository(db),
	);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	if (!value || typeof value !== "object" || Array.isArray(value)) return false;
	const prototype = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
}

function compareStrings(left: string, right: string): number {
	return left < right ? -1 : left > right ? 1 : 0;
}

function canonicalStringify(value: unknown, stack = new Set<object>()): string {
	if (value === null) return "null";
	if (typeof value === "string" || typeof value === "boolean")
		return JSON.stringify(value);
	if (typeof value === "number") {
		if (!Number.isFinite(value))
			throw new TypeError("Structural revision contains a non-finite number");
		return JSON.stringify(value);
	}
	if (typeof value === "undefined")
		throw new TypeError("Structural revision contains undefined data");
	if (typeof value !== "object")
		throw new TypeError("Structural revision contains non-JSON data");
	if (stack.has(value))
		throw new TypeError("Structural revision contains a circular value");

	stack.add(value);
	let serialized: string;
	if (Array.isArray(value)) {
		serialized = `[${value
			.map((entry) => canonicalStringify(entry, stack))
			.join(",")}]`;
	} else {
		if (!isRecord(value))
			throw new TypeError("Structural revision contains non-plain data");
		serialized = `{${Object.keys(value)
			.sort(compareStrings)
			.map(
				(key) =>
					`${JSON.stringify(key)}:${canonicalStringify(value[key], stack)}`,
			)
			.join(",")}}`;
	}
	stack.delete(value);
	return serialized;
}

function hashCanonical(value: unknown): string {
	return createHash("sha256").update(canonicalStringify(value)).digest("hex");
}

function sortCanonical<T>(values: readonly T[]): T[] {
	return [...values].sort((left, right) =>
		compareStrings(canonicalStringify(left), canonicalStringify(right)),
	);
}

function readRecord(value: unknown): Record<string, unknown> | undefined {
	if (typeof value === "string") {
		try {
			return readRecord(JSON.parse(value));
		} catch {
			return undefined;
		}
	}
	return isRecord(value) ? value : undefined;
}

function routeDefinitions(meta: unknown): Record<string, unknown> {
	const settings = readRecord(meta) ?? {};
	const direct = readRecord(settings.route) ?? {};
	if (Object.keys(direct).length) return direct;
	return readRecord(readRecord(settings.data)?.route) ?? {};
}

function normalizeDefaults(
	meta: unknown,
	routes: ReturnType<typeof getConfiguredRequestRoutes>,
) {
	const definitions = routeDefinitions(meta);
	return routes.map((route) => {
		const definition = readRecord(definitions[route.itemTypeUid]) ?? {};
		const requestGeneration = readRecord(definition.requestGeneration) ?? {};
		const stored = requestGeneration.defaults;
		if (stored == null) return { route: route.itemTypeUid };
		if (!isRecord(stored)) {
			return { route: route.itemTypeUid, defaults: { invalid: stored } };
		}

		const defaults: Record<string, unknown> = {};
		for (const [stepUid, componentUid] of Object.entries(stored)) {
			if (componentUid === null) continue;
			if (typeof componentUid === "string") {
				if (!componentUid.trim()) {
					defaults[stepUid] = { invalid: componentUid };
				} else {
					defaults[stepUid] = componentUid.trim();
				}
			} else {
				defaults[stepUid] = { invalid: componentUid };
			}
		}
		return { route: route.itemTypeUid, defaults };
	});
}

function normalizeComponentMeta(meta: unknown): Record<string, unknown> {
	const parsed = readRecord(meta);
	if (!parsed) return { invalid: true };
	return {
		...(Object.hasOwn(parsed, "deletedAt")
			? { deletedAt: parsed.deletedAt }
			: {}),
		variations: parsed.variations ?? [],
		...(parsed.sectionOverride == null
			? {}
			: { sectionOverride: parsed.sectionOverride }),
	};
}

function componentTitle(
	component: RequestConfigurationComponent,
): string | null {
	for (const value of [
		component.name,
		component.door?.title,
		component.product?.title,
	]) {
		if (typeof value === "string" && value.trim()) return value;
	}
	return null;
}

function normalizeComponent(component: RequestConfigurationComponent) {
	return {
		id: component.id,
		uid: component.uid,
		dykeStepId: component.dykeStepId,
		title: componentTitle(component),
		redirectUid: component.redirectUid,
		...(component.isDefault ? { default: true } : {}),
		...(typeof component.sortIndex === "number"
			? { sortIndex: component.sortIndex }
			: {}),
		meta: normalizeComponentMeta(component.meta),
	};
}

function normalizeStep(step: RequestConfigurationStep) {
	const meta = readRecord(step.meta);
	return {
		id: step.id,
		uid: step.uid,
		title: step.title,
		...(isRequestConfigurationStepCustom(step.meta) ? { custom: true } : {}),
		...(meta && Object.hasOwn(meta, "doorSizeVariation")
			? { doorSizeVariation: meta.doorSizeVariation }
			: {}),
	};
}

function normalizeRootComponent(
	component: RequestConfigurationComponent & {
		step?: RequestConfigurationStep;
	},
) {
	return {
		component: normalizeComponent(component),
		step: component.step ? normalizeStep(component.step) : null,
	};
}

export type SalesRequestGenerationAdminWarningCode =
	| "stale"
	| "deleted"
	| "hidden"
	| "dependency-ineligible";

export type SalesRequestGenerationAdminWarning = {
	code: SalesRequestGenerationAdminWarningCode;
	message: string;
	repairable: true;
};

export type SalesRequestGenerationAdminStep = {
	uid: string;
	title: string;
	candidates: Array<{ uid: string; title: string }>;
	defaultComponentUid: string | null;
	warnings: SalesRequestGenerationAdminWarning[];
};

export type SalesRequestGenerationAdminRoute = {
	rootUid: string;
	steps: SalesRequestGenerationAdminStep[];
	warnings: SalesRequestGenerationAdminWarning[];
};

export type SalesRequestGenerationAdminSettings = {
	configurationRevision: string | null;
	routes: SalesRequestGenerationAdminRoute[];
};

function warning(
	code: SalesRequestGenerationAdminWarningCode,
	message: string,
): SalesRequestGenerationAdminWarning {
	return { code, message, repairable: true };
}

function isComponentMetadataDeleted(component: RequestConfigurationComponent) {
	return Boolean(readRecord(component.meta)?.deletedAt);
}

function adminComponentTitle(component: RequestConfigurationComponent) {
	return componentTitle(component)?.trim() ?? "";
}

function compareAdminComponents(
	left: RequestConfigurationComponent,
	right: RequestConfigurationComponent,
) {
	const leftIndex =
		typeof left.sortIndex === "number"
			? left.sortIndex
			: Number.MAX_SAFE_INTEGER;
	const rightIndex =
		typeof right.sortIndex === "number"
			? right.sortIndex
			: Number.MAX_SAFE_INTEGER;
	if (leftIndex !== rightIndex) return leftIndex - rightIndex;
	const leftTitle = adminComponentTitle(left);
	const rightTitle = adminComponentTitle(right);
	const byTitle = leftTitle.localeCompare(rightTitle);
	if (byTitle) return byTitle;
	return String(left.uid ?? "").localeCompare(String(right.uid ?? ""));
}

function readAdminStoredDefaults(meta: unknown, rootUid: string) {
	const definitions = routeDefinitions(meta);
	const definition = readRecord(definitions[rootUid]);
	const requestGeneration = readRecord(definition?.requestGeneration);
	const stored = requestGeneration?.defaults;
	if (stored == null)
		return { values: new Map<string, unknown>(), warnings: [] };
	if (!isRecord(stored)) {
		return {
			values: new Map<string, unknown>(),
			warnings: [
				warning(
					"stale",
					`Request-generation defaults for ${rootUid} need repair.`,
				),
			],
		};
	}
	return { values: new Map(Object.entries(stored)), warnings: [] };
}

function readVisibilityDependencies(meta: unknown) {
	const componentMeta = readRecord(meta);
	const variations = Array.isArray(componentMeta?.variations)
		? componentMeta.variations
		: [];
	const dependencies = new Map<string, Set<string>>();
	for (const variation of variations) {
		const rules = readRecord(variation)?.rules;
		if (!Array.isArray(rules)) continue;
		for (const rule of rules) {
			const record = readRecord(rule);
			const stepUid =
				typeof record?.stepUid === "string" ? record.stepUid.trim() : "";
			if (!stepUid) continue;
			const componentUids = Array.isArray(record?.componentsUid)
				? record.componentsUid.filter(
						(value): value is string =>
							typeof value === "string" && value.trim().length > 0,
					)
				: typeof record?.componentsUid === "string" &&
						record.componentsUid.trim()
					? [record.componentsUid.trim()]
					: [];
			const existing = dependencies.get(stepUid) ?? new Set<string>();
			for (const uid of componentUids) existing.add(uid.trim());
			dependencies.set(stepUid, existing);
		}
	}
	return dependencies;
}

function selectAdminCatalogComponents(
	components: readonly RequestConfigurationComponent[],
	defaultComponentUids: ReadonlySet<string>,
	completeStepIds: ReadonlySet<number>,
	policy: ReturnType<typeof salesRequestCatalogPolicySchema.parse>,
) {
	const eligibleSource = components.filter(
		(component) =>
			component.deletedAt == null &&
			component.custom !== true &&
			typeof component.uid === "string" &&
			component.uid.trim().length > 0 &&
			!isComponentMetadataDeleted(component) &&
			adminComponentTitle(component).length > 0,
	);
	try {
		return selectSalesRequestCatalogCandidates({
			components: eligibleSource,
			includeUnused: true,
			defaultComponentUids,
			completeStepIds,
			policy,
		}).components;
	} catch {
		// A stale or excluded default must not make the Super Admin repair screen
		// unloadable. Rebuild the candidate list without that default and surface the
		// problem on the affected step below.
		try {
			return selectSalesRequestCatalogCandidates({
				components: eligibleSource,
				includeUnused: true,
				defaultComponentUids: new Set(),
				completeStepIds,
				policy,
			}).components;
		} catch {
			return [];
		}
	}
}

function readAdminStep(
	step: RequestConfigurationStep | undefined,
	stepUid: string,
	components: readonly RequestConfigurationComponent[],
	eligibleComponents: readonly RequestConfigurationComponent[],
	rawDefault: unknown,
	allStepUids: ReadonlySet<string>,
	componentUidsByStepUid: ReadonlyMap<string, ReadonlySet<string>>,
	selectedByStepUid: Readonly<Record<string, string>>,
): SalesRequestGenerationAdminStep {
	const defaultComponentUid =
		typeof rawDefault === "string" && rawDefault.trim()
			? rawDefault.trim()
			: null;
	const warnings: SalesRequestGenerationAdminWarning[] = [];
	if (rawDefault !== undefined && rawDefault !== null && !defaultComponentUid) {
		warnings.push(
			warning("stale", `Default for ${stepUid} is not a valid component UID.`),
		);
	}

	const activeComponents = components.filter(
		(component) =>
			component.deletedAt == null && component.uid === defaultComponentUid,
	);
	const matchingComponent = activeComponents.find(
		(component) => !isComponentMetadataDeleted(component),
	);
	if (defaultComponentUid && !matchingComponent) {
		const deleted = components.some(
			(component) =>
				component.uid === defaultComponentUid &&
				(component.deletedAt != null || isComponentMetadataDeleted(component)),
		);
		warnings.push(
			warning(
				deleted ? "deleted" : "stale",
				deleted
					? `Default ${defaultComponentUid} was deleted and needs repair.`
					: `Default ${defaultComponentUid} is no longer active and needs repair.`,
			),
		);
	}

	const eligibleUids = new Set(
		eligibleComponents
			.filter((component) => component.uid)
			.map((component) => component.uid as string),
	);
	if (matchingComponent && !eligibleUids.has(defaultComponentUid as string)) {
		warnings.push(
			warning(
				"dependency-ineligible",
				`Default ${defaultComponentUid} is not eligible for request generation.`,
			),
		);
	}

	if (matchingComponent && eligibleUids.has(defaultComponentUid as string)) {
		const dependencies = readVisibilityDependencies(matchingComponent.meta);
		let dependencyIssue = false;
		for (const [dependencyStepUid, dependencyComponentUids] of dependencies) {
			if (!allStepUids.has(dependencyStepUid)) {
				dependencyIssue = true;
				break;
			}
			const available = componentUidsByStepUid.get(dependencyStepUid);
			if (
				!available ||
				[...dependencyComponentUids].some((uid) => !available.has(uid))
			) {
				dependencyIssue = true;
				break;
			}
		}
		if (dependencyIssue) {
			warnings.push(
				warning(
					"dependency-ineligible",
					`Default ${defaultComponentUid} has an unavailable visibility dependency.`,
				),
			);
		} else if (
			[...dependencies.keys()].every(
				(dependencyStepUid) => selectedByStepUid[dependencyStepUid],
			) &&
			!isComponentVisibleByRules(
				{
					variations: Array.isArray(
						readRecord(matchingComponent.meta)?.variations,
					)
						? readRecord(matchingComponent.meta)?.variations
						: [],
				},
				selectedByStepUid as Record<string, string>,
			)
		) {
			warnings.push(
				warning(
					"hidden",
					`Default ${defaultComponentUid} is hidden by the configured visibility rules.`,
				),
			);
		}
	}

	const candidateByUid = new Map<string, RequestConfigurationComponent>();
	for (const component of eligibleComponents) {
		if (component.uid && !candidateByUid.has(component.uid))
			candidateByUid.set(component.uid, component);
	}
	const candidates = [...candidateByUid.values()]
		.sort(compareAdminComponents)
		.map((component) => ({
			uid: component.uid as string,
			title: adminComponentTitle(component),
		}));
	return {
		uid: stepUid,
		title: step?.title?.trim() || "Unavailable step",
		candidates,
		defaultComponentUid,
		warnings,
	};
}

/** Read the repair surface for Super Admin settings without exposing prices. */
export async function getSalesRequestGenerationAdminSettings(
	db: ConfigurationDatabase,
	input: { settingId: number },
): Promise<SalesRequestGenerationAdminSettings> {
	const setting = await db.settings.findFirst({
		where: { id: input.settingId, type: "sales-settings", deletedAt: null },
		select: { id: true, meta: true },
	});
	if (!setting) throw new Error(`Sales settings not found: ${input.settingId}`);

	const routes = getConfiguredRequestRoutes(setting.meta);
	const orderedStepUids = [
		...new Set(routes.flatMap((route) => route.stepUids)),
	];
	const stepCandidates = orderedStepUids.length
		? await db.dykeSteps.findMany({
				where: { uid: { in: orderedStepUids }, deletedAt: null },
				select: stepSelect,
			})
		: [];
	const stepByUid = new Map<string, RequestConfigurationStep>();
	for (const uid of orderedStepUids) {
		const matches = stepCandidates
			.filter((step) => step.uid === uid)
			.sort((left, right) => right.id - left.id);
		const selected = matches[0];
		if (selected) stepByUid.set(uid, selected);
	}
	const stepIds = [...new Set([...stepByUid.values()].map((step) => step.id))];
	const components = stepIds.length
		? await db.dykeStepProducts.findMany({
				where: { dykeStepId: { in: stepIds }, step: { deletedAt: null } },
				select: componentSelect,
			})
		: [];
	const rootUids = new Set(routes.map((route) => route.itemTypeUid));
	const rootComponents = rootUids.size
		? await db.dykeStepProducts.findMany({
				where: {
					uid: { in: [...rootUids] },
					deletedAt: null,
					step: { deletedAt: null },
				},
				select: { ...componentSelect, step: { select: stepSelect } },
			})
		: [];
	const rootByUid = new Map(
		rootComponents
			.filter(
				(component) =>
					typeof component.uid === "string" && rootUids.has(component.uid),
			)
			.map((component) => [component.uid as string, component]),
	);

	const requestGeneration =
		readRecord(readRecord(setting.meta)?.requestGeneration) ?? {};
	const parsedPolicy = salesRequestCatalogPolicySchema.safeParse(
		requestGeneration.catalogPolicy,
	);
	const policy = parsedPolicy.success
		? parsedPolicy.data
		: salesRequestCatalogPolicySchema.parse({});
	const storedDefaults = new Map(
		routes.map((route) => [
			route.itemTypeUid,
			readAdminStoredDefaults(setting.meta, route.itemTypeUid),
		]),
	);
	const defaultComponentUids = new Set(
		[...storedDefaults.values()].flatMap(({ values }) =>
			[...values.values()].flatMap((value) =>
				typeof value === "string" && value.trim() ? [value.trim()] : [],
			),
		),
	);
	const completeStepIds = new Set(
		[...stepByUid.values()]
			.filter((step) =>
				/^(?:moulding|molding)s?$/i.test(step.title?.trim() ?? ""),
			)
			.map((step) => step.id),
	);
	const eligibleComponents = selectAdminCatalogComponents(
		components,
		defaultComponentUids,
		completeStepIds,
		policy,
	);
	const eligibleByStepId = new Map<number, RequestConfigurationComponent[]>();
	for (const component of eligibleComponents) {
		const family = eligibleByStepId.get(component.dykeStepId) ?? [];
		family.push(component);
		eligibleByStepId.set(component.dykeStepId, family);
	}
	const allStepUids = new Set(orderedStepUids);
	const componentUidsByStepUid = new Map<string, Set<string>>();
	for (const step of stepByUid.values()) {
		componentUidsByStepUid.set(
			step.uid as string,
			new Set(
				components
					.filter(
						(component) =>
							component.dykeStepId === step.id &&
							component.deletedAt == null &&
							component.custom !== true &&
							!isComponentMetadataDeleted(component) &&
							typeof component.uid === "string",
					)
					.map((component) => component.uid as string),
			),
		);
	}
	for (const component of rootComponents) {
		const stepUid = component.step?.uid;
		if (!stepUid || typeof component.uid !== "string") continue;
		allStepUids.add(stepUid);
		if (
			component.deletedAt != null ||
			component.custom === true ||
			isComponentMetadataDeleted(component)
		)
			continue;
		const uids = componentUidsByStepUid.get(stepUid) ?? new Set<string>();
		uids.add(component.uid);
		componentUidsByStepUid.set(stepUid, uids);
	}

	const resultRoutes = routes.map((route) => {
		const stored = storedDefaults.get(route.itemTypeUid);
		const routeWarnings = [...(stored?.warnings ?? [])];
		const routeDefaultValues = stored?.values ?? new Map<string, unknown>();
		for (const stepUid of routeDefaultValues.keys()) {
			if (!route.stepUids.includes(stepUid)) {
				routeWarnings.push(
					warning(
						"stale",
						`Default for ${stepUid} is not configured on route ${route.itemTypeUid}.`,
					),
				);
			}
		}
		const selectedByStepUid: Record<string, string> = {};
		const rootComponent = rootByUid.get(route.itemTypeUid);
		if (rootComponent?.step?.uid && rootComponent.uid) {
			selectedByStepUid[rootComponent.step.uid] = rootComponent.uid;
		}
		for (const stepUid of route.stepUids) {
			const value = routeDefaultValues.get(stepUid);
			const step = stepByUid.get(stepUid);
			const matching = components.find(
				(component) =>
					component.dykeStepId === step?.id &&
					component.uid === value &&
					component.deletedAt == null &&
					!isComponentMetadataDeleted(component),
			);
			if (typeof value === "string" && matching) {
				selectedByStepUid[stepUid] = value.trim();
			}
		}
		return {
			rootUid: route.itemTypeUid,
			steps: route.stepUids.map((stepUid) => {
				const step = stepByUid.get(stepUid);
				const stepComponents = components.filter(
					(component) => component.dykeStepId === step?.id,
				);
				return readAdminStep(
					step,
					stepUid,
					stepComponents,
					eligibleByStepId.get(step?.id ?? -1) ?? [],
					routeDefaultValues.get(stepUid),
					allStepUids,
					componentUidsByStepUid,
					selectedByStepUid,
				);
			}),
			warnings: routeWarnings,
		};
	});

	let configurationRevision: string | null = null;
	try {
		configurationRevision =
			await getSalesRequestConfigurationStructuralRevision(db, input);
	} catch {
		// A malformed structural snapshot should not hide repair controls.
	}
	return { configurationRevision, routes: resultRoutes };
}

/**
 * Fingerprint only the fields consumed by the price-free projection. This is
 * intentionally not a cheap invalidation counter: it still reads structural
 * settings, step, and component rows, but lets cache hits avoid the complete
 * projection/serialization work. Prices, images, and unrelated metadata are
 * deliberately absent.
 */
export async function getSalesRequestConfigurationStructuralRevision(
	db: ConfigurationDatabase,
	input: { settingId: number },
): Promise<string> {
	const repository = createSalesRequestConfigurationRepository(db);
	const setting = await repository.getSetting(input.settingId);
	if (!setting) throw new Error(`Sales settings not found: ${input.settingId}`);

	const routes = getConfiguredRequestRoutes(setting.meta);
	const configuredStepUids = getConfiguredRequestStepUids(routes);
	const steps = configuredStepUids.length
		? await repository.getStepsByUids(configuredStepUids)
		: [];
	const rootComponentUids = [
		...new Set(routes.map((route) => route.itemTypeUid)),
	];
	const rootComponents = rootComponentUids.length
		? await repository.getRootComponentsByUids(rootComponentUids)
		: [];
	const stepIds = [
		...new Set(
			steps
				.map((step) => step.id)
				.filter((id) => Number.isSafeInteger(id) && id > 0),
		),
	];
	const components = stepIds.length
		? await repository.getComponentsByStepIds(stepIds)
		: [];

	return hashCanonical({
		// Version 8 retains unused standard candidates regardless of usage metrics.
		// Bump whenever the cached wire projection changes. Version 6 removes the
		// deferred Shelf Items route from the model context. Version 5 keeps the
		// complete active standard catalog for Moulding steps. Version 4 includes
		// the sanitized height-driven door-size variation structure. Version 3 removes
		// persisted custom components from the model catalog and moves custom
		// capability to the authoritative step metadata.
		version: 8,
		settingId: input.settingId,
		routes: routes.map((route) => ({
			itemTypeUid: route.itemTypeUid,
			stepUids: [...route.stepUids],
			...(route.config ? { config: { ...route.config } } : {}),
		})),
		steps: sortCanonical(steps.map(normalizeStep)),
		rootComponents: sortCanonical(
			rootComponents
				.filter((component) => component.custom !== true)
				.map(normalizeRootComponent),
		),
		components: sortCanonical(
			components
				.filter((component) => component.custom !== true)
				.map(normalizeComponent),
		),
	});
}

function snapshotFromProjection(
	projected: Awaited<ReturnType<typeof projectRequestConfiguration>>,
	input: { settingId: number },
) {
	return {
		...projected,
		settingId: input.settingId,
		scope: `sales-settings:${input.settingId}`,
		// Public snapshot revision remains the content identity. Cache artifacts
		// use the separate price-free structural revision as their key.
		revision: createHash("sha256")
			.update(projected.configurationJson)
			.digest("hex"),
	};
}

async function buildFreshSnapshot(
	db: ConfigurationDatabase,
	input: { settingId: number },
) {
	const repository = createSalesRequestConfigurationRepository(db);
	const projected = await projectRequestConfiguration({
		...input,
		repository,
	});
	return {
		...snapshotFromProjection(projected, input),
		...(repository.getDiagnostics()
			? { diagnostics: repository.getDiagnostics() }
			: {}),
	};
}

function asStringRecord(value: unknown): Record<string, string> | undefined {
	if (!isRecord(value)) return undefined;
	const result: Record<string, string> = {};
	for (const [key, entry] of Object.entries(value)) {
		if (typeof entry !== "string") return undefined;
		result[key] = entry;
	}
	return result;
}

function decodeCachedConfiguration(
	content: string,
): { configuration: SalesRequestConfiguration } | undefined {
	let value: unknown;
	try {
		value = JSON.parse(content);
	} catch {
		return undefined;
	}
	if (!isRecord(value) || value.schemaVersion !== 1) return undefined;
	if (
		!Array.isArray(value.componentColumns) ||
		value.componentColumns.length !== SALES_REQUEST_COMPONENT_COLUMNS.length ||
		value.componentColumns.some(
			(column, index) => column !== SALES_REQUEST_COMPONENT_COLUMNS[index],
		)
	)
		return undefined;
	if (!Array.isArray(value.routes) || !Array.isArray(value.steps))
		return undefined;
	if (!isRecord(value.visibilityByComponentUid)) return undefined;
	if (
		value.serviceNames !== undefined &&
		(!Array.isArray(value.serviceNames) ||
			value.serviceNames.length > 20 ||
			value.serviceNames.some(
				(name) => typeof name !== "string" || !name.trim(),
			))
	)
		return undefined;

	const stepIds = new Set<number>();
	const stepUids = new Set<string>();
	const componentUids = new Set<string>();
	const steps: SalesRequestConfigurationStep[] = [];
	for (const rawStep of value.steps) {
		if (!isRecord(rawStep)) return undefined;
		const {
			id,
			uid,
			title,
			custom,
			selectionMode,
			doorSizeVariation,
			components,
		} = rawStep;
		if (
			!Number.isSafeInteger(id) ||
			(id as number) <= 0 ||
			typeof uid !== "string" ||
			typeof title !== "string" ||
			(custom !== undefined && custom !== true) ||
			(doorSizeVariation !== undefined && !Array.isArray(doorSizeVariation)) ||
			!Array.isArray(components)
		)
			return undefined;
		if (stepIds.has(id as number) || stepUids.has(uid)) return undefined;
		if (
			selectionMode !== undefined &&
			selectionMode !== "single" &&
			selectionMode !== "multiple"
		)
			return undefined;
		const decodedSelectionMode =
			selectionMode === "single" || selectionMode === "multiple"
				? selectionMode
				: undefined;
		stepIds.add(id as number);
		stepUids.add(uid);
		const decodedComponents: SalesRequestConfigurationComponent[] = [];
		for (const rawComponent of components) {
			if (
				!Array.isArray(rawComponent) ||
				rawComponent.length !== 2 ||
				typeof rawComponent[0] !== "string" ||
				typeof rawComponent[1] !== "string"
			)
				return undefined;
			const [componentUid, componentTitle] = rawComponent;
			if (componentUids.has(componentUid)) return undefined;
			componentUids.add(componentUid);
			decodedComponents.push({
				uid: componentUid,
				title: componentTitle,
			});
		}
		steps.push({
			id: id as number,
			uid,
			title,
			...(custom === true ? { custom: true } : {}),
			...(decodedSelectionMode ? { selectionMode: decodedSelectionMode } : {}),
			...(Array.isArray(doorSizeVariation)
				? {
						doorSizeVariation:
							doorSizeVariation as SalesRequestConfigurationStep["doorSizeVariation"],
					}
				: {}),
			components: decodedComponents,
		});
	}

	const routes: unknown[] = [];
	const routeUids = new Set<string>();
	const configuredStepUidSet = new Set(steps.map((step) => step.uid));
	for (const rawRoute of value.routes) {
		if (!isRecord(rawRoute)) return undefined;
		const { itemTypeUid, rootStepId, stepUids, defaults } = rawRoute;
		if (
			typeof itemTypeUid !== "string" ||
			!Number.isSafeInteger(rootStepId) ||
			(rootStepId as number) <= 0 ||
			!Array.isArray(stepUids) ||
			stepUids.some((stepUid) => typeof stepUid !== "string")
		)
			return undefined;
		if (routeUids.has(itemTypeUid)) return undefined;
		routeUids.add(itemTypeUid);
		if (rootStepId !== null && !steps.some((step) => step.id === rootStepId))
			return undefined;
		if (stepUids.some((stepUid) => !configuredStepUidSet.has(stepUid)))
			return undefined;
		if (defaults !== undefined && !asStringRecord(defaults)) return undefined;
		const route = { ...rawRoute };
		routes.push(route);
	}

	const configuration: SalesRequestConfiguration = {
		schemaVersion: 1,
		routes,
		steps,
		visibilityByComponentUid: value.visibilityByComponentUid,
		...(Array.isArray(value.serviceNames)
			? { serviceNames: value.serviceNames as string[] }
			: {}),
	};
	try {
		if (serializeSalesRequestConfiguration(configuration) !== content)
			return undefined;
	} catch {
		return undefined;
	}

	return { configuration };
}

function cachedSnapshot(
	artifact: SalesRequestConfigurationArtifact,
	input: { settingId: number },
) {
	const decoded = decodeCachedConfiguration(artifact.content);
	if (!decoded) return undefined;
	return snapshotFromProjection(
		{
			...decoded,
			configurationJson: artifact.content,
		},
		input,
	);
}

const MAX_SNAPSHOT_ATTEMPTS = 3;

async function readCachedSnapshot(
	db: ConfigurationDatabase,
	input: { settingId: number },
	cache: SalesRequestConfigurationCache,
) {
	const scope = `sales-settings:${input.settingId}`;
	let freshnessProbeFailed = false;
	for (let attempt = 0; attempt < MAX_SNAPSHOT_ATTEMPTS; attempt += 1) {
		let structuralRevision: string;
		try {
			structuralRevision = await getSalesRequestConfigurationStructuralRevision(
				db,
				input,
			);
		} catch {
			// Without an initial revision we cannot bind a projection or cache hit to
			// a stable structural snapshot. Retry, then fail closed below.
			freshnessProbeFailed = true;
			continue;
		}

		let artifact: SalesRequestConfigurationArtifact | undefined;
		try {
			artifact = await cache.get({ scope, revision: structuralRevision });
		} catch {
			// Redis is an optimization; a fresh projection remains authoritative.
		}
		if (
			artifact &&
			artifact.scope === scope &&
			artifact.revision === structuralRevision
		) {
			const snapshot = cachedSnapshot(artifact, input);
			if (snapshot) {
				try {
					const currentRevision =
						await getSalesRequestConfigurationStructuralRevision(db, input);
					if (currentRevision === structuralRevision) return snapshot;
				} catch {
					// A cache artifact without a successful freshness confirmation is not
					// safe to return. Retry and fail closed after the bounded attempts.
					freshnessProbeFailed = true;
					continue;
				}
				continue;
			}
		}

		const projected = await projectRequestConfiguration({
			...input,
			repository: createSalesRequestConfigurationRepository(db),
		});
		let currentRevision: string;
		try {
			currentRevision = await getSalesRequestConfigurationStructuralRevision(
				db,
				input,
			);
		} catch {
			// Do not return an unconfirmed newly-built projection. Retry so a
			// transient database read can recover, then fail closed below.
			freshnessProbeFailed = true;
			continue;
		}
		if (currentRevision !== structuralRevision) continue;

		const snapshot = snapshotFromProjection(projected, input);
		try {
			await cache.set({
				scope,
				revision: structuralRevision,
				content: projected.configurationJson,
			});
		} catch {
			// Return the fresh DB result even when publication is unavailable.
		}
		try {
			const confirmedRevision =
				await getSalesRequestConfigurationStructuralRevision(db, input);
			if (confirmedRevision === structuralRevision) return snapshot;
		} catch {
			// Publication is optional, but freshness confirmation is mandatory.
			freshnessProbeFailed = true;
		}
	}

	throw new Error(
		freshnessProbeFailed
			? "Sales request configuration freshness could not be confirmed; please retry"
			: "Sales request configuration changed while loading; please retry",
	);
}

/** One projection supplies both model candidates and deterministic validation rules. */
export async function getSalesRequestConfigurationSnapshot(
	db: ConfigurationDatabase,
	input: { settingId: number },
	options: SalesRequestConfigurationSnapshotOptions = {},
) {
	if (!options.cache) return buildFreshSnapshot(db, input);
	return readCachedSnapshot(db, input, options.cache);
}
