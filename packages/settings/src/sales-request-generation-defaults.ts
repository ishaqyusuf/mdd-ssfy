import { type Db, Prisma } from "@gnd/db";

const SALES_SETTINGS_TYPE = "sales-settings";
const SETTINGS_TRANSACTION_TIMEOUT_MS = 60_000;

export type SalesRequestGenerationDefaults = Readonly<
	Record<string, Readonly<Record<string, string>>>
>;

export type UpdateSalesRequestGenerationDefaultInput = {
	settingId: number;
	rootUid: string;
	stepUid: string;
	componentUid: string | null;
};

export type SalesRequestGenerationDefaultUpdate = {
	changed: boolean;
	settingId: number;
	rootUid: string;
	stepUid: string;
	componentUid: string | null;
	defaults: SalesRequestGenerationDefaults;
};

type RecordValue = Record<string, unknown>;

function isRecord(value: unknown): value is RecordValue {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

function strictRecord(value: unknown, label: string): RecordValue {
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

function hasText(value: unknown): value is string {
	return typeof value === "string" && value.trim().length > 0;
}

function own(record: RecordValue, key: string) {
	return Object.prototype.hasOwnProperty.call(record, key);
}

// Assignment to __proto__ on a normal object has surprising semantics. JSON
// metadata is user-editable, so define dynamic UID keys as own properties.
function setOwn(record: RecordValue, key: string, value: unknown) {
	Object.defineProperty(record, key, {
		configurable: true,
		enumerable: true,
		value,
		writable: true,
	});
}

function cloneRecord(value: unknown, label: string): RecordValue {
	return { ...strictRecord(value, label) };
}

function requireSettingId(value: unknown): asserts value is number {
	if (!Number.isSafeInteger(value) || (value as number) <= 0) {
		throw new Error("A valid sales settings ID is required");
	}
}

function requireUid(value: unknown, label: string) {
	if (!hasText(value)) throw new Error(`A valid ${label} is required`);
	return value.trim();
}

function requireNullableUid(value: unknown) {
	if (value === null) return null;
	return requireUid(value, "component UID");
}

type RouteContext = {
	settings: RecordValue;
	data: RecordValue;
	routeDefinitions: RecordValue;
	usesDirectRoute: boolean;
};

function resolveRouteContext(meta: unknown): RouteContext {
	const settings = strictRecord(meta, "metadata");
	const directRoute = strictRecord(settings.route, "route");
	const data = strictRecord(settings.data, "data");
	const nestedRoute = strictRecord(data.route, "data.route");
	const usesDirectRoute = Object.keys(directRoute).length > 0;

	return {
		settings,
		data,
		routeDefinitions: usesDirectRoute ? directRoute : nestedRoute,
		usesDirectRoute,
	};
}

function readRouteStepUids(rootUid: string, route: RecordValue) {
	if (!Array.isArray(route.routeSequence)) {
		throw new Error(`Invalid routeSequence for root component ${rootUid}`);
	}

	const stepUids = new Set<string>();
	for (const [index, entry] of route.routeSequence.entries()) {
		const item = strictRecord(
			entry,
			`route ${rootUid}.routeSequence[${index}]`,
		);
		if (item.uid === "" && index === route.routeSequence.length - 1) {
			// Existing settings use a final empty UID as a route terminator.
			continue;
		}
		if (!hasText(item.uid) || item.uid.trim() !== item.uid) {
			throw new Error(`Invalid routeSequence entry ${rootUid}[${index}]`);
		}
		if (stepUids.has(item.uid)) {
			throw new Error(`Duplicate configured route step UID: ${item.uid}`);
		}
		stepUids.add(item.uid);
	}
	return stepUids;
}

function validateRouteDefinitions(routeDefinitions: RecordValue) {
	for (const [rootUid, rawRoute] of Object.entries(routeDefinitions)) {
		if (!hasText(rootUid)) {
			throw new Error("Configured route has an empty root component UID");
		}
		const route = strictRecord(rawRoute, `route ${rootUid}`);
		readRouteStepUids(rootUid, route);
	}
}

function readStoredDefaults(rootUid: string, route: RecordValue) {
	const requestGeneration = strictRecord(
		route.requestGeneration,
		`route ${rootUid}.requestGeneration`,
	);
	const storedValue = requestGeneration.defaults;
	if (storedValue == null) {
		return {
			requestGeneration,
			rawDefaults: {} as RecordValue,
			normalizedDefaults: {} as RecordValue,
		};
	}

	const rawDefaults = cloneRecord(
		storedValue,
		`route ${rootUid}.requestGeneration.defaults`,
	);
	const normalizedDefaults: RecordValue = {};
	for (const [stepUid, componentUid] of Object.entries(rawDefaults)) {
		if (!hasText(stepUid) || stepUid.trim() !== stepUid) {
			throw new Error(
				`Invalid request-generation default step for route ${rootUid}`,
			);
		}
		if (componentUid === null) continue;
		if (!hasText(componentUid)) {
			throw new Error(
				`Invalid request-generation default for ${rootUid}/${stepUid}`,
			);
		}
		if (own(normalizedDefaults, stepUid)) {
			throw new Error(
				`Duplicate request-generation default step UID: ${stepUid}`,
			);
		}
		setOwn(normalizedDefaults, stepUid, componentUid.trim());
	}

	return { requestGeneration, rawDefaults, normalizedDefaults };
}

function readDefaultsFromRoutes(
	routeDefinitions: RecordValue,
): SalesRequestGenerationDefaults {
	const defaults: RecordValue = {};
	for (const [rootUid, rawRoute] of Object.entries(routeDefinitions)) {
		const route = strictRecord(rawRoute, `route ${rootUid}`);
		const { normalizedDefaults } = readStoredDefaults(rootUid, route);
		if (Object.keys(normalizedDefaults).length > 0) {
			setOwn(defaults, rootUid, { ...normalizedDefaults });
		}
	}
	return defaults as SalesRequestGenerationDefaults;
}

/**
 * Read persisted request-generation defaults for one explicit sales-settings
 * row. The route map follows the dashboard's direct-route-then-nested-route
 * precedence and null defaults are treated as cleared values.
 */
export async function getSalesRequestGenerationDefaults(
	db: Pick<Db, "settings">,
	settingId: number,
): Promise<SalesRequestGenerationDefaults> {
	requireSettingId(settingId);
	const setting = await db.settings.findFirst({
		where: { id: settingId, type: SALES_SETTINGS_TYPE, deletedAt: null },
		select: { id: true, meta: true },
	});
	if (!setting) throw new Error(`Sales settings not found: ${settingId}`);
	if (setting.id !== settingId) {
		throw new Error(`Sales settings identity mismatch: ${settingId}`);
	}

	const context = resolveRouteContext(setting.meta);
	validateRouteDefinitions(context.routeDefinitions);
	return readDefaultsFromRoutes(context.routeDefinitions);
}

/**
 * Persist one route/step default while retaining every unrelated settings
 * field. The row lock and serializable transaction make read/modify/write
 * updates safe when two authorized callers edit different steps concurrently.
 */
export async function updateSalesRequestGenerationDefault(
	db: Db,
	rawInput: UpdateSalesRequestGenerationDefaultInput,
): Promise<SalesRequestGenerationDefaultUpdate> {
	const settingId = rawInput?.settingId;
	requireSettingId(settingId);
	const rootUid = requireUid(rawInput?.rootUid, "route root UID");
	const stepUid = requireUid(rawInput?.stepUid, "step UID");
	const componentUid = requireNullableUid(rawInput?.componentUid);

	return db.$transaction(
		async (tx) => {
			const lockedRows = await tx.$queryRaw<Array<{ id: number }>>(
				Prisma.sql`SELECT id FROM Settings
					WHERE id=${settingId}
					  AND type=${SALES_SETTINGS_TYPE}
					  AND deletedAt IS NULL
					FOR UPDATE`,
			);
			if (!lockedRows.some((row) => row.id === settingId)) {
				throw new Error(`Sales settings not found: ${settingId}`);
			}

			const setting = await tx.settings.findFirst({
				where: { id: settingId, type: SALES_SETTINGS_TYPE, deletedAt: null },
				select: { id: true, meta: true },
			});
			if (!setting) throw new Error(`Sales settings not found: ${settingId}`);
			if (setting.id !== settingId) {
				throw new Error(`Sales settings identity mismatch: ${settingId}`);
			}

			const context = resolveRouteContext(setting.meta);
			validateRouteDefinitions(context.routeDefinitions);
			if (!own(context.routeDefinitions, rootUid)) {
				throw new Error(`Configured route not found: ${rootUid}`);
			}

			const rawRoute = context.routeDefinitions[rootUid];
			const route = strictRecord(rawRoute, `route ${rootUid}`);
			const routeStepUids = readRouteStepUids(rootUid, route);
			if (!routeStepUids.has(stepUid)) {
				throw new Error(
					`Step ${stepUid} is not configured for route ${rootUid}`,
				);
			}

			const stepCandidates = await tx.dykeSteps.findMany({
				where: { uid: stepUid, deletedAt: null },
				select: { id: true, uid: true },
			});
			if (stepCandidates.length === 0) {
				throw new Error(`Missing configured step UID: ${stepUid}`);
			}
			for (const candidate of stepCandidates) {
				if (
					!Number.isSafeInteger(candidate.id) ||
					candidate.id <= 0 ||
					candidate.uid !== stepUid
				) {
					throw new Error(`Invalid configured step identity: ${stepUid}`);
				}
			}
			// Match the New Sales Form's deterministic UID lookup: the newest
			// active row (highest numeric ID) owns a duplicated legacy step UID.
			const step = stepCandidates.reduce((latest, candidate) =>
				candidate.id > latest.id ? candidate : latest,
			);

			if (componentUid !== null) {
				const activeComponents = await tx.dykeStepProducts.findMany({
					where: { dykeStepId: step.id, deletedAt: null },
					select: { uid: true, meta: true },
				});
				const activeComponentUids = new Set<string>();
				let selectedComponentFound = false;
				for (const component of activeComponents) {
					if (
						!hasText(component.uid) ||
						component.uid.trim() !== component.uid
					) {
						throw new Error(
							`Invalid active component identity for step ${stepUid}`,
						);
					}
					if (activeComponentUids.has(component.uid)) {
						throw new Error(`Duplicate active component UID: ${component.uid}`);
					}
					activeComponentUids.add(component.uid);
					if (component.uid !== componentUid) continue;
					selectedComponentFound = true;
					const componentMeta = strictRecord(
						component.meta,
						`component ${componentUid} metadata`,
					);
					if (componentMeta.deletedAt) {
						throw new Error(
							`Component ${componentUid} is not active in step ${stepUid}`,
						);
					}
				}
				if (!selectedComponentFound) {
					throw new Error(
						`Component ${componentUid} is not active in step ${stepUid}`,
					);
				}
			}

			const { requestGeneration } = readStoredDefaults(rootUid, route);
			const nextRoute = cloneRecord(rawRoute, `route ${rootUid}`);
			const nextRequestGeneration = cloneRecord(
				requestGeneration,
				`route ${rootUid}.requestGeneration`,
			);
			const nextDefaults = cloneRecord(
				requestGeneration.defaults,
				`route ${rootUid}.requestGeneration.defaults`,
			);
			const hadStoredValue = own(nextDefaults, stepUid);
			const previousValue = nextDefaults[stepUid];
			let changed = false;

			if (componentUid === null) {
				changed = hadStoredValue;
				if (hadStoredValue) delete nextDefaults[stepUid];
			} else {
				changed =
					!hadStoredValue ||
					previousValue !== componentUid ||
					typeof previousValue !== "string";
				if (changed) setOwn(nextDefaults, stepUid, componentUid);
			}

			if (changed) {
				setOwn(nextRequestGeneration, "defaults", nextDefaults);
				setOwn(nextRoute, "requestGeneration", nextRequestGeneration);
				const nextRouteDefinitions = { ...context.routeDefinitions };
				setOwn(nextRouteDefinitions, rootUid, nextRoute);

				const nextMeta = { ...context.settings };
				if (context.usesDirectRoute) {
					setOwn(nextMeta, "route", nextRouteDefinitions);
				} else {
					const nextData = { ...context.data };
					setOwn(nextData, "route", nextRouteDefinitions);
					setOwn(nextMeta, "data", nextData);
				}

				await tx.settings.update({
					where: { id: setting.id },
					data: { meta: nextMeta },
				});

				return {
					changed,
					settingId,
					rootUid,
					stepUid,
					componentUid,
					defaults: readDefaultsFromRoutes(nextRouteDefinitions),
				};
			}

			return {
				changed: false,
				settingId,
				rootUid,
				stepUid,
				componentUid,
				defaults: readDefaultsFromRoutes(context.routeDefinitions),
			};
		},
		{
			isolationLevel: "Serializable",
			timeout: SETTINGS_TRANSACTION_TIMEOUT_MS,
		},
	);
}
