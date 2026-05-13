"use client";

import createContextFactory from "@/utils/context-factory";
import { isArrayParser } from "@/utils/nuq-is-array";

import { useQueryStates } from "nuqs";
import { useMemo, useState } from "react";

interface Props {
	// biome-ignore lint/suspicious/noExplicitAny: nuqs parser maps are intentionally generic across page schemas.
	filterSchema?: Partial<Record<string, any>>;
	defaults?: Record<string, unknown>;
	searchKey?: string;
}
export const {
	Provider: SearchFilterProvider,
	useContext: useSearchFilterContext,
} = createContextFactory(
	({ filterSchema, defaults, searchKey = "q" }: Props) => {
		const [isOpen, setIsOpen] = useState(false);
		const [isFocused, setIsFocused] = useState(false);
		const [filters, setFilters] = useQueryStates(filterSchema, {
			// shallow: false,
		});

		const hasFilter = useMemo(
			() =>
				Object.entries(filters || {}).some(
					([key, value]) => key !== searchKey && isActiveFilterValue(value),
				),
			[filters, searchKey],
		);

		const shouldFetch = isOpen || isFocused || hasFilter;

		function normalizeFilterValue(parser, value) {
			if (value === null || value === undefined) return value;
			if (!parser?.parse) return value;

			try {
				return parser.parse(String(value));
			} catch {
				return value;
			}
		}

		function setFilter(update: Record<string, unknown> | null) {
			if (update === null) {
				setFilters(defaults ?? null);
				return;
			}

			const normalizedUpdate = Object.fromEntries(
				Object.entries(update).map(([key, value]) => [
					key,
					normalizeEmptyFilterValue(value),
				]),
			);

			if (
				Object.entries(normalizedUpdate).every(([key, value]) =>
					isSameFilterValue(filters?.[key], value),
				)
			) {
				return;
			}

			setFilters(normalizedUpdate);
		}

		function clearFilter(key: string) {
			setFilter({ [key]: null });
		}

		function clearAll() {
			setFilter(null);
		}

		function setSearch(value: string | null) {
			setFilter({ [searchKey]: value && value.length > 0 ? value : null });
		}

		function optionSelected(qk, { label, value }) {
			const parser = filterSchema?.[qk];
			const isArray = isArrayParser(parser) || isArrayParserBySample(parser);
			const normalizedValue = normalizeFilterValue(parser, value);
			const currentValue = filters?.[qk];

			setFilter({
				[qk]: !isArray
					? normalizedValue
					: Array.isArray(currentValue) &&
							currentValue.includes(normalizedValue)
						? normalizeEmptyFilterValue(
								currentValue.filter((s) => s !== normalizedValue),
							)
						: [
								...(Array.isArray(currentValue) ? currentValue : []),
								normalizedValue,
							],
			});
		}

		function isOptionSelected(qk: string, value: unknown) {
			const parser = filterSchema?.[qk];
			const normalizedValue = normalizeFilterValue(parser, value);
			const currentValue = filters?.[qk];

			if (Array.isArray(currentValue)) {
				return currentValue.includes(normalizedValue);
			}

			return String(currentValue) === String(normalizedValue);
		}

		return {
			shouldFetch,
			optionSelected,
			isOptionSelected,
			isFocused,
			setIsFocused,
			isOpen,
			setIsOpen,
			filters,
			setFilters: setFilter,
			rawSetFilters: setFilters,
			clearFilter,
			clearAll,
			setSearch,
			searchKey,
		};
	},
);

function isActiveFilterValue(value: unknown) {
	if (value === null || value === undefined || value === "") return false;
	if (Array.isArray(value)) return value.length > 0;
	return true;
}

function normalizeEmptyFilterValue(value: unknown) {
	if (Array.isArray(value) && value.length === 0) return null;
	if (value === "") return null;
	return value;
}

function isSameFilterValue(previous: unknown, next: unknown) {
	if (Array.isArray(previous) || Array.isArray(next)) {
		return JSON.stringify(previous ?? null) === JSON.stringify(next ?? null);
	}

	return previous === next;
}

function isArrayParserBySample(parser) {
	if (!parser?.parse) return false;

	for (const sample of ["1,2", "1"]) {
		try {
			if (Array.isArray(parser.parse(sample))) {
				return true;
			}
		} catch {
			// Try the next sample.
		}
	}

	return false;
}
