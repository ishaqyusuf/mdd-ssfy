"use client";

import { useSearchStore } from "@/store/search";
import { useTRPC } from "@/trpc/client";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@gnd/ui/command";
import { useQuery } from "@gnd/ui/tanstack";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { useDebounceValue } from "usehooks-ts";

type SearchSourceName =
	| "sales"
	| "quotes"
	| "dispatch"
	| "employees"
	| "customers"
	| "projects"
	| "units"
	| "templates"
	| "builders";

interface SearchItem {
	id: string;
	type: string;
	title: string;
	name?: SearchSourceName;
	resultHeader?: string;
	subtitle?: string;
	href?: string;
	meta?: Record<string, unknown>;
	action?: () => void;
}

const SEARCH_SOURCES: SearchSourceName[] = [
	"sales",
	"quotes",
	"dispatch",
	"employees",
	"customers",
	"projects",
	"units",
	"templates",
	"builders",
];

const GROUP_ORDER = [
	"sales",
	"quotes",
	"dispatch",
	"employees",
	"customers",
	"projects",
	"units",
	"templates",
	"builders",
] as const;

const formatGroupName = (name: string): string => {
	switch (name) {
		case "sales":
			return "Sales Results";
		case "quotes":
			return "Quote Results";
		case "dispatch":
			return "Dispatch Results";
		case "employees":
			return "Employee Results";
		case "customers":
			return "Customer Results";
		case "projects":
			return "Project Results";
		case "units":
			return "Unit Results";
		case "templates":
			return "Template Results";
		case "builders":
			return "Builder Results";
		default:
			return "Results";
	}
};

function SearchResultItemDisplay({ item }: { item: SearchItem }) {
	return (
		<CommandItem
			key={item.id}
			value={`${item.name || item.type}-${item.id}-${item.title}`}
			onSelect={() => item.action?.()}
			className="text-sm flex flex-col items-start gap-1 py-2"
		>
			<span className="w-full truncate">{item.title}</span>
			{item.subtitle ? (
				<span className="w-full truncate text-xs text-muted-foreground">
					{item.subtitle}
				</span>
			) : null}
		</CommandItem>
	);
}

export function Search() {
	const router = useRouter();
	const { setOpen } = useSearchStore();
	const trpc = useTRPC();

	const [debounceDelay, setDebounceDelay] = useState(200);
	const [debouncedSearch, setDebouncedSearch] = useDebounceValue(
		"",
		debounceDelay,
	);

	const listRef = useRef<HTMLDivElement>(null);
	const listHeightRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	const {
		data: queryResult,
		isLoading,
		isFetching,
	} = useQuery({
		...trpc.search.global.queryOptions({
			searchTerm: debouncedSearch,
			sources: SEARCH_SOURCES,
			limit: 50,
		}),
		placeholderData: (previousData) => previousData,
	});

	const searchResults: SearchItem[] = queryResult || [];

	const combinedData = useMemo(() => {
		return searchResults.map((item) => ({
			...item,
			action: () => {
				if (!item.href) return;
				setOpen();
				router.push(item.href);
			},
		}));
	}, [router, searchResults, setOpen]);

	const groupedData = useMemo(() => {
		const groups: Record<string, SearchItem[]> = {};

		for (const item of combinedData) {
			const key = item.type || "other";
			if (!groups[key]) groups[key] = [];
			groups[key].push(item);
		}

		const ordered: Record<string, SearchItem[]> = {};

		for (const key of GROUP_ORDER) {
			if (groups[key]?.length) {
				ordered[key] = groups[key];
			}
		}

		for (const key in groups) {
			if (!ordered[key] && groups[key]?.length) {
				ordered[key] = groups[key];
			}
		}

		return ordered;
	}, [combinedData]);

	return (
		<Command
			shouldFilter={false}
			className="search-container overflow-hidden p-0 relative w-full bg-background backdrop-filter dark:border-[#2C2C2C] backdrop-blur-lg dark:bg-[#151515]/[99] h-auto border border-border"
		>
			<div className="border-b border-border relative">
				<CommandInput
					ref={inputRef}
					placeholder="Type a command or search..."
					onValueChange={(value: string) => {
						setDebouncedSearch(value);

						if (value.trim().split(/\s+/).length > 1) {
							setDebounceDelay(700);
						} else {
							setDebounceDelay(200);
						}
					}}
					className="px-4 h-[55px] py-0"
				/>
				{isFetching ? (
					<div className="absolute bottom-0 h-[2px] w-full overflow-hidden">
						<div className="absolute top-[1px] h-full w-40 animate-slide-effect bg-gradient-to-r dark:from-gray-800 dark:via-white dark:via-80% dark:to-gray-800 from-gray-200 via-black via-80% to-gray-200" />
					</div>
				) : null}
			</div>

			<div className="px-2 global-search-list" ref={listRef}>
				<CommandList ref={listHeightRef} className="scrollbar-hide">
					{!isLoading && combinedData.length === 0 && debouncedSearch ? (
						<CommandEmpty>
							No results found for "{debouncedSearch}".
						</CommandEmpty>
					) : null}

					{!isLoading
						? Object.entries(groupedData).map(([groupName, items]) => (
								<CommandGroup
									key={groupName}
									heading={formatGroupName(groupName)}
								>
									{items.map((item) => (
										<SearchResultItemDisplay
											key={`${item.type}-${item.id}`}
											item={item}
										/>
									))}
								</CommandGroup>
							))
						: null}
				</CommandList>
			</div>
		</Command>
	);
}
