import type { NavModule } from "./types";

type SelectableModule = NavModule & {
	href?: string;
};

type ModuleLike = {
	name?: string | null;
	activeLinkCount?: number;
};

export function resolveSelectedModule<T extends SelectableModule>(
	modules: T[],
	selectedModuleName?: string | null,
	activeModuleName?: string | null,
) {
	return (
		modules.find((module) => module.name === selectedModuleName) ??
		modules.find((module) => module.name === activeModuleName) ??
		modules[0]
	);
}

export function resolveVisibleNavModules<T extends ModuleLike>(
	modules: T[],
	selectedModuleName?: string | null,
	activeModuleName?: string | null,
) {
	const namedModules = modules.filter(
		(module) => module.activeLinkCount && module.name?.trim(),
	);
	const selectedModule =
		namedModules.find((module) => module.name === selectedModuleName) ??
		namedModules.find((module) => module.name === activeModuleName) ??
		namedModules[0];
	const unnamedModules = modules.filter(
		(module) => module.activeLinkCount && !module.name?.trim(),
	);

	return selectedModule ? [selectedModule, ...unnamedModules] : unnamedModules;
}
