export type SalesRequestConfigurationComponent = {
	uid: string;
	title: string;
	/** Stable catalog order; used for sorting but omitted from the model tuple. */
	sortIndex?: number | null;
};

export type SalesRequestConfigurationStep = {
	id: number;
	uid: string;
	title: string;
	custom?: true;
	selectionMode?: "single" | "multiple";
	components: Array<SalesRequestConfigurationComponent>;
};

export type SalesRequestConfiguration = {
	schemaVersion: 1;
	routes: unknown[];
	steps: Array<SalesRequestConfigurationStep>;
	visibilityByComponentUid: Record<string, unknown>;
	serviceNames?: string[];
};

export const SALES_REQUEST_COMPONENT_COLUMNS = Object.freeze([
	"uid",
	"title",
] as const);

type ProjectedStep = {
	id: number;
	uid: string;
	title: string;
	custom?: true;
	selectionMode?: "single" | "multiple";
	components: Array<readonly [string, string]>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	if (!value || typeof value !== "object" || Array.isArray(value)) return false;
	const prototype = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
}

function compareStrings(left: string, right: string): number {
	return left < right ? -1 : left > right ? 1 : 0;
}

export function compareSalesRequestComponents(
	left: SalesRequestConfigurationComponent,
	right: SalesRequestConfigurationComponent,
): number {
	const leftIndex = Number.isFinite(left.sortIndex)
		? (left.sortIndex as number)
		: Number.MAX_SAFE_INTEGER;
	const rightIndex = Number.isFinite(right.sortIndex)
		? (right.sortIndex as number)
		: Number.MAX_SAFE_INTEGER;
	return (
		leftIndex - rightIndex ||
		left.title.localeCompare(right.title) ||
		compareStrings(left.uid, right.uid)
	);
}

function assertConfiguration(
	value: unknown,
): asserts value is SalesRequestConfiguration {
	if (!isRecord(value))
		throw new TypeError("Sales request configuration must be an object");
	if (value.schemaVersion !== 1)
		throw new TypeError(
			"Unsupported sales request configuration schema version",
		);
	if (!Array.isArray(value.routes))
		throw new TypeError("Sales request configuration routes must be an array");
	if (!Array.isArray(value.steps))
		throw new TypeError("Sales request configuration steps must be an array");
	if (!isRecord(value.visibilityByComponentUid))
		throw new TypeError(
			"Sales request configuration visibility must be an object",
		);
	if (
		value.serviceNames !== undefined &&
		(!Array.isArray(value.serviceNames) ||
			value.serviceNames.length > 20 ||
			value.serviceNames.some(
				(name) => typeof name !== "string" || !name.trim(),
			))
	) {
		throw new TypeError(
			"Sales request service names must be a bounded array of non-empty strings",
		);
	}
}

function projectSteps(
	steps: Array<SalesRequestConfigurationStep>,
): Array<ProjectedStep> {
	const stepUids = new Set<string>();
	const stepIds = new Set<number>();
	const componentUids = new Set<string>();

	const projected = steps.map((step): ProjectedStep => {
		if (
			!isRecord(step) ||
			!Number.isSafeInteger(step.id) ||
			step.id <= 0 ||
			typeof step.uid !== "string" ||
			typeof step.title !== "string"
		)
			throw new TypeError(
				"Sales request configuration steps need positive numeric IDs, string UIDs, and titles",
			);
		if (stepUids.has(step.uid))
			throw new Error(`Duplicate step UID: ${step.uid}`);
		stepUids.add(step.uid);
		if (stepIds.has(step.id)) throw new Error(`Duplicate step ID: ${step.id}`);
		stepIds.add(step.id);
		if (!Array.isArray(step.components))
			throw new TypeError(`Components for step ${step.uid} must be an array`);

		const components = [...step.components]
			.sort(compareSalesRequestComponents)
			.map((component) => {
				if (
					!isRecord(component) ||
					typeof component.uid !== "string" ||
					typeof component.title !== "string"
				)
					throw new TypeError(
						`Components for step ${step.uid} need string UIDs and titles`,
					);
				if (componentUids.has(component.uid))
					throw new Error(`Duplicate component UID: ${component.uid}`);
				componentUids.add(component.uid);
				return [component.uid, component.title] as const;
			});
		return {
			id: step.id,
			uid: step.uid,
			title: step.title,
			...(step.custom === true ? { custom: true as const } : {}),
			...(step.selectionMode ? { selectionMode: step.selectionMode } : {}),
			components,
		};
	});

	return projected.sort((left, right) => compareStrings(left.uid, right.uid));
}

function stringifyCanonical(value: unknown, stack = new Set<object>()): string {
	if (value === null) return "null";
	if (typeof value === "string" || typeof value === "boolean") {
		return JSON.stringify(value);
	}
	if (typeof value === "number") {
		if (!Number.isFinite(value))
			throw new TypeError(
				"Sales request configuration contains a non-finite number",
			);
		return JSON.stringify(value);
	}
	if (typeof value === "undefined")
		throw new TypeError("Sales request configuration contains undefined data");
	if (typeof value !== "object")
		throw new TypeError("Sales request configuration contains non-JSON data");
	if (stack.has(value))
		throw new TypeError(
			"Sales request configuration contains a circular value",
		);

	stack.add(value);
	let serialized: string;
	if (Array.isArray(value)) {
		serialized = `[${value
			.map((entry) => stringifyCanonical(entry, stack))
			.join(",")}]`;
	} else {
		if (!isRecord(value))
			throw new TypeError(
				"Sales request configuration contains non-plain data",
			);
		serialized = `{${Object.keys(value)
			.sort(compareStrings)
			.map(
				(key) =>
					`${JSON.stringify(key)}:${stringifyCanonical(value[key], stack)}`,
			)
			.join(",")}}`;
	}
	stack.delete(value);
	return serialized;
}

/** Serialize the price-free configuration without changing route/rule array order. */
export function serializeSalesRequestConfiguration(
	configuration: SalesRequestConfiguration,
): string {
	assertConfiguration(configuration);

	const payload = {
		componentColumns: SALES_REQUEST_COMPONENT_COLUMNS,
		routes: configuration.routes,
		schemaVersion: configuration.schemaVersion,
		...(configuration.serviceNames?.length
			? { serviceNames: [...configuration.serviceNames] }
			: {}),
		steps: projectSteps(configuration.steps),
		visibilityByComponentUid: configuration.visibilityByComponentUid,
	};

	return stringifyCanonical(payload);
}
