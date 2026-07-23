import { readSalesFormObjectMetadata } from "./metadata";

type PersistedDoorRouteStep = {
	meta?: unknown;
	component?: {
		meta?: unknown;
	} | null;
};

export type PersistedDoorRouteLine = {
	meta?: unknown;
	formSteps?: PersistedDoorRouteStep[] | null;
};

export type PersistedDoorRouteConfig = {
	noHandle?: boolean;
	hasSwing?: boolean;
};

function applySectionOverride(
	config: PersistedDoorRouteConfig,
	value: unknown,
) {
	const override = readSalesFormObjectMetadata(value)?.sectionOverride;
	if (
		!override ||
		typeof override !== "object" ||
		Array.isArray(override) ||
		override.overrideMode !== true
	) {
		return;
	}
	if (typeof override.noHandle === "boolean") {
		config.noHandle = override.noHandle;
	}
	if (typeof override.hasSwing === "boolean") {
		config.hasSwing = override.hasSwing;
	}
}

export function resolvePersistedSalesLineDoorRouteConfig(
	line: PersistedDoorRouteLine,
) {
	const config: PersistedDoorRouteConfig = {};
	for (const formStep of line.formSteps || []) {
		applySectionOverride(config, formStep.meta);
		applySectionOverride(config, formStep.component?.meta);
	}

	const lineMeta = readSalesFormObjectMetadata(line.meta);
	const storedConfig = readSalesFormObjectMetadata(
		lineMeta?.workflowDoorRouteConfig,
	);
	if (typeof storedConfig?.noHandle === "boolean") {
		config.noHandle = storedConfig.noHandle;
	}
	if (typeof storedConfig?.hasSwing === "boolean") {
		config.hasSwing = storedConfig.hasSwing;
	}

	return config;
}
