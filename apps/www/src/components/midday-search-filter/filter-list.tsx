import { format, parseISO } from "date-fns";
import { motion } from "framer-motion";
import { formatDateRange } from "little-date";

import type { PageFilterData } from "@api/type";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { Skeleton } from "@gnd/ui/skeleton";
import {
	type FilterDefinition,
	buildOptionLabelLookup,
	getFilterValueLabel,
	normalizeFilterDefinitions,
} from "./filter-definitions";
import { isSearchKey } from "./search-utils";

const listVariant = {
	hidden: { y: 10, opacity: 0 },
	show: {
		y: 0,
		opacity: 1,
		transition: {
			duration: 0.05,
			staggerChildren: 0.06,
		},
	},
};

const itemVariant = {
	hidden: { y: 10, opacity: 0 },
	show: { y: 0, opacity: 1 },
};

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

		if (definition?.renderChip) {
			const Chip = definition.renderChip;
			return <Chip definition={definition} value={value} filters={filters} />;
		}

		if (definition?.type === "date-range" || key === "start") {
			return formatDateValue({ key, value, filters });
		}

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
			<motion.ul
				variants={listVariant}
				initial="hidden"
				animate="show"
				className="flex w-max min-w-full gap-2 lg:min-w-0 lg:flex-wrap"
			>
				{loading && (
					<div className="flex gap-2">
						<motion.li key="1" variants={itemVariant}>
							<Skeleton className="h-8 w-[100px] rounded-full" />
						</motion.li>
						<motion.li key="2" variants={itemVariant}>
							<Skeleton className="h-8 w-[100px] rounded-full" />
						</motion.li>
					</div>
				)}

				{!loading &&
					visibleEntries.map(([key, value]) => (
						<motion.li key={key} variants={itemVariant}>
							<Button
								className="group flex h-8 shrink-0 items-center space-x-1 rounded-full bg-secondary px-3 font-normal text-[#878787] hover:bg-secondary"
								onClick={() => handleOnRemove(key)}
							>
								<Icons.Clear className="w-0 scale-0 transition-all group-hover:w-4 group-hover:scale-100" />
								<span>{renderFilter({ key, value })}</span>
							</Button>
						</motion.li>
					))}
				{!loading && visibleEntries.length > 0 && onClearAll && (
					<motion.li key="clear-all" variants={itemVariant}>
						<Button
							className="flex h-8 shrink-0 items-center rounded-full bg-secondary px-3 font-normal text-[#878787] hover:bg-secondary"
							onClick={onClearAll}
						>
							Clear filters
						</Button>
					</motion.li>
				)}
			</motion.ul>
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
