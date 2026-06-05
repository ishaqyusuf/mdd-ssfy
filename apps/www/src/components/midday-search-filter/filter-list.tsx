import { format, parseISO } from "date-fns";
import { formatDateRange } from "little-date";

import type { PageFilterData } from "@api/type";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { Skeleton } from "@gnd/ui/skeleton";
import {
	type FilterDefinition,
	type FilterOption,
	buildOptionLabelLookup,
	getFilterValueLabel,
	normalizeFilterDefinitions,
} from "./filter-definitions";
import { FilterOptionColor } from "./filter-option-color";
import { isSearchKey } from "./search-utils";

interface Props {
	loading?: boolean;
	filterList?: PageFilterData[];
	definitions?: FilterDefinition[];
	optionLookup?: Map<string, Map<string, string>>;
	filters;
	onRemove?;
	onClearAll?;
}

export function FilterList({
	loading,
	filterList,
	definitions: definitionsProp,
	optionLookup: optionLookupProp,
	filters,
	onRemove,
	onClearAll,
}: Props) {
	const definitions =
		definitionsProp || normalizeFilterDefinitions(filterList ?? []);
	const optionLookup = optionLookupProp || buildOptionLabelLookup(definitions);

	const handleOnRemove = (key: string) => {
		if (key === "start") {
			onRemove?.({ start: null, end: null });
			return;
		}

		onRemove?.({ [key]: null });
	};

	const activeEntries = Object.entries(filters || {}).filter(([key, value]) => {
		if (value === null || value === undefined || value === "") return false;
		if (Array.isArray(value)) return value.length > 0;
		return true;
	});
	const visibleEntries = activeEntries.filter(([key]) => !isHiddenChipKey(key));

	const renderFilter = ({ key, value }) => {
		const definition = definitions.find((item) => item.key === key);
		const colorLabel = renderColoredFilterValue({ definition, value });
		const fallbackLabel = getFilterValueLabel({
			key,
			value,
			definitions,
			optionLookup,
			filters,
		});

		if (definition?.renderChip) {
			const Chip = definition.renderChip;
			const rendered = (
				<Chip definition={definition} value={value} filters={filters} />
			);

			return rendered || fallbackLabel;
		}

		if (definition?.type === "date-range" || key === "start") {
			return formatDateValue({ key, value, filters });
		}

		if (colorLabel) return colorLabel;

		return getFilterValueLabel({
			key,
			value,
			definitions,
			optionLookup,
			filters,
		});
	};

	return (
		<div className="w-full min-w-0 overflow-x-auto pb-1">
			<ul className="flex w-max min-w-full gap-2 lg:min-w-0 lg:flex-wrap">
				{loading && (
					<>
						<li>
							<Skeleton className="h-8 w-[100px] rounded-full" />
						</li>
						<li>
							<Skeleton className="h-8 w-[100px] rounded-full" />
						</li>
					</>
				)}

				{!loading &&
					visibleEntries.map(([key, value]) => (
						<li key={key}>
							<Button
								className="group flex h-8 shrink-0 items-center overflow-hidden rounded-full bg-secondary px-3 font-normal text-[#878787] transition-[gap,padding] duration-200 ease-out hover:gap-1.5 hover:bg-secondary"
								onClick={() => handleOnRemove(key)}
							>
								<Icons.Clear className="size-4 w-0 -translate-x-1 scale-75 opacity-0 transition-[width,opacity,transform] duration-200 ease-out group-hover:w-4 group-hover:translate-x-0 group-hover:scale-100 group-hover:opacity-100" />
								<span>{renderFilter({ key, value })}</span>
							</Button>
						</li>
					))}
				{!loading && visibleEntries.length > 0 && onClearAll && (
					<li key="clear-all">
						<Button
							className="flex h-8 shrink-0 items-center rounded-full bg-secondary px-3 font-normal text-[#878787] hover:bg-secondary"
							onClick={onClearAll}
						>
							Clear filters
						</Button>
					</li>
				)}
			</ul>
		</div>
	);
}

function isHiddenChipKey(key: string) {
	return key === "end" || isSearchKey(key);
}

function formatDateValue({
	key,
	value,
	filters,
}: {
	key: string;
	value: unknown;
	filters: Record<string, unknown>;
}) {
	if (key === "start" && value && filters.end) {
		return formatDateRange(toDate(value), toDate(filters.end), {
			includeTime: false,
		});
	}

	if (Array.isArray(value)) {
		return value
			.filter((item) => item && item !== "-")
			.map((item) => {
				const parsed = safeDate(item);
				return parsed ? format(parsed, "MMM d, yyyy") : String(item);
			})
			.join(" - ");
	}

	const parsed = safeDate(value);

	if (parsed) {
		return format(parsed, "MMM d, yyyy");
	}

	return String(value);
}

function renderColoredFilterValue({
	definition,
	value,
}: {
	definition?: FilterDefinition;
	value: unknown;
}) {
	if (!definition?.options?.some((option) => option.color)) return null;

	const values = Array.isArray(value) ? value : [value];
	const options = values.map((item) => findOption(definition, item));

	const hasColor = options.some((option) => option?.color);
	if (!hasColor) return null;

	return (
		<span className="inline-flex items-center gap-1.5">
			{options.map((option, index) => (
				<span
					key={`${option?.value || String(index)}-${index}`}
					className="inline-flex min-w-0 items-center gap-1.5"
				>
					<FilterOptionColor color={option?.color} />
					<span>{option?.label || String(values[index])}</span>
					{index < options.length - 1 ? <span>,</span> : null}
				</span>
			))}
		</span>
	);
}

function findOption(
	definition: FilterDefinition,
	value: unknown,
): FilterOption | undefined {
	return definition.options?.find((option) => option.value === String(value));
}

function toDate(value: unknown) {
	return safeDate(value) || new Date(String(value));
}

function safeDate(value: unknown) {
	if (!value || typeof value !== "string") return null;

	try {
		const parsed = parseISO(value);
		if (!Number.isNaN(parsed.getTime())) return parsed;
	} catch {
		return null;
	}

	return null;
}
