"use client";

import type { PageFilterData } from "@api/type";
import type { IconKeys } from "@gnd/ui/icons";
import type { ComponentType, ReactNode } from "react";
import { searchIcons } from "./search-utils";

export type FilterCommitMode = "debounced" | "immediate" | "submit";

export type FilterOption = {
	label: string;
	subLabel?: string;
	value: string;
	color?: string;
};

export type FilterControlProps = {
	definition: FilterDefinition;
	value: unknown;
	filters: Record<string, unknown>;
	setFilter: (update: Record<string, unknown> | null) => void;
	toggleOption: (key: string, option: FilterOption) => void;
};

export type FilterChipProps = {
	definition?: FilterDefinition;
	value: unknown;
	filters: Record<string, unknown>;
};

export type FilterFormatContext = {
	definition?: FilterDefinition;
	filters: Record<string, unknown>;
	optionLabel: (key: string, value: unknown) => string | undefined;
};

export type FilterDefinition = {
	key: string;
	label: string;
	type:
		| "search"
		| "checkbox"
		| "single-select"
		| "multi-select"
		| "date"
		| "date-range"
		| "custom";
	icon?: IconKeys;
	options?: FilterOption[];
	optionSource?: "server-prefetched" | "lazy-client" | "static";
	commitMode?: FilterCommitMode;
	debounceMs?: number;
	renderControl?: ComponentType<FilterControlProps>;
	renderChip?: ComponentType<FilterChipProps>;
	formatValue?: (value: unknown, context: FilterFormatContext) => ReactNode;
};

type CreateFilterConfigInput = {
	search?: {
		key?: string;
		placeholder?: string;
		commitMode?: FilterCommitMode;
		debounceMs?: number;
	};
	filters?: FilterDefinition[];
};

export function createFilterConfig(config: CreateFilterConfigInput) {
	return config;
}

export function normalizeFilterDefinitions(
	filterList: Array<PageFilterData | FilterDefinition> = [],
): FilterDefinition[] {
	return filterList
		.filter(Boolean)
		.map((filter) => {
			if ("key" in filter && filter.key) {
				return filter as FilterDefinition;
			}

			const pageFilter = filter as PageFilterData;
			const key = String(pageFilter.value ?? "");
			const label = pageFilter.label || labelFromKey(key);
			const type = normalizeFilterType(pageFilter.type);

			return {
				key,
				label,
				type,
				icon: (pageFilter.icon || searchIcons[key]) as IconKeys,
				options: pageFilter.options?.map((option) => ({
					label: option.label,
					subLabel: option.subLabel,
					value: String(option.value),
					color: option.color,
				})),
				optionSource: "server-prefetched",
			} satisfies FilterDefinition;
		})
		.filter((filter) => Boolean(filter.key));
}

export function buildOptionLabelLookup(definitions: FilterDefinition[]) {
	const lookup = new Map<string, Map<string, string>>();

	for (const definition of definitions) {
		if (!definition.options?.length) continue;

		lookup.set(
			definition.key,
			new Map(
				definition.options.map((option) => [
					String(option.value),
					option.label,
				]),
			),
		);
	}

	return lookup;
}

export function getFilterValueLabel({
	key,
	value,
	definitions,
	optionLookup,
	filters,
}: {
	key: string;
	value: unknown;
	definitions: FilterDefinition[];
	optionLookup: Map<string, Map<string, string>>;
	filters: Record<string, unknown>;
}) {
	const definition = definitions.find((item) => item.key === key);
	const optionLabel = (filterKey: string, filterValue: unknown) =>
		optionLookup.get(filterKey)?.get(String(filterValue));

	if (definition?.formatValue) {
		return definition.formatValue(value, {
			definition,
			filters,
			optionLabel,
		});
	}

	if (Array.isArray(value)) {
		return value
			.map((item) => optionLabel(key, item) || String(item))
			.join(", ");
	}

	return optionLabel(key, value) || String(value);
}

function normalizeFilterType(
	type: PageFilterData["type"],
): FilterDefinition["type"] {
	if (type === "input") return "search";
	if (type === "checkbox") return "multi-select";
	return type;
}

function labelFromKey(key: string) {
	return key
		.split(".")
		.map((part) =>
			part
				.replace(/([A-Z])/g, " $1")
				.replace(/^./, (letter) => letter.toUpperCase()),
		)
		.join(" ");
}
