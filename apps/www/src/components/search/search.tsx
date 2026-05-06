"use client";

import { useAuth } from "@/hooks/use-auth";
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
import { Icons } from "@gnd/ui/icons";
import { useQuery } from "@gnd/ui/tanstack";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { useDebounceValue } from "usehooks-ts";
import { type Access, _perm, validateRules } from "../sidebar-links";

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

const QUICK_LINKS: {
	id: string;
	title: string;
	subtitle: string;
	href: string;
	icon: keyof typeof Icons;
	rules: Access[];
}[] = [
	{
		id: "sales",
		title: "Sales",
		subtitle: "Review orders and active sales work",
		href: "/sales-book/orders",
		icon: "orders",
		rules: [_perm.is("editOrders")],
	},
	{
		id: "quotes",
		title: "Quotes",
		subtitle: "Find estimates and quote activity",
		href: "/sales-book/quotes",
		icon: "quotes",
		rules: [_perm.is("viewEstimates")],
	},
	{
		id: "new-sale",
		title: "New sale",
		subtitle: "Start a new sales order",
		href: "/sales-book/create-order",
		icon: "add",
		rules: [_perm.is("editOrders")],
	},
	{
		id: "new-quote",
		title: "New quote",
		subtitle: "Create a customer estimate",
		href: "/sales-book/create-quote",
		icon: "edit",
		rules: [_perm.is("editEstimates")],
	},
];

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

function normalizeSearchResults(items: unknown): SearchItem[] {
	if (!Array.isArray(items)) return [];

	return items.flatMap((item) => {
		if (!item || typeof item !== "object") return [];

		const result = item as Partial<SearchItem>;
		if (!result.id || !result.title || !result.type) return [];

		return [
			{
				...result,
				id: result.id,
				title: result.title,
				type: result.type,
			},
		];
	});
}

function QuickLinkItemDisplay({
	item,
	onSelect,
}: {
	item: (typeof QUICK_LINKS)[number];
	onSelect: (href: string) => void;
}) {
	const Icon = Icons[item.icon];

	return (
		<CommandItem
			value={`quick-link-${item.id}-${item.title}`}
			onSelect={() => onSelect(item.href)}
			className="flex items-center gap-3 rounded-md px-3 py-3 text-sm"
		>
			<span className="flex size-9 shrink-0 items-center justify-center rounded-md border bg-muted/50 text-muted-foreground">
				{Icon ? <Icon className="size-4" /> : null}
			</span>
			<span className="min-w-0 flex-1">
				<span className="block truncate font-medium">{item.title}</span>
				<span className="block truncate text-xs text-muted-foreground">
					{item.subtitle}
				</span>
			</span>
		</CommandItem>
	);
}

export function Search() {
	const router = useRouter();
	const { setOpen } = useSearchStore();
	const trpc = useTRPC();
	const auth = useAuth();

	const [debounceDelay, setDebounceDelay] = useState(200);
	const [searchValue, setSearchValue] = useState("");
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

	const searchResults = useMemo(
		() => normalizeSearchResults(queryResult),
		[queryResult],
	);

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

	const quickLinks = useMemo(() => {
		if (!auth.enabled || auth.isPending) return [];

		return QUICK_LINKS.filter((item) =>
			validateRules(item.rules, auth.can, auth.id, auth.role),
		);
	}, [auth.can, auth.enabled, auth.id, auth.isPending, auth.role]);

	const openHref = (href: string) => {
		setOpen();
		router.push(href);
	};

	return (
		<Command
			shouldFilter={false}
			className="search-container relative h-full w-full overflow-hidden border border-border bg-background p-0 backdrop-blur-lg backdrop-filter dark:border-[#2C2C2C] dark:bg-[#151515]/[99]"
		>
			<div className="border-b border-border relative">
				<div className="flex items-center">
					<CommandInput
						ref={inputRef}
						placeholder="Type a command or search..."
						onValueChange={(value: string) => {
							setSearchValue(value);
							setDebouncedSearch(value);

							if (value.trim().split(/\s+/).length > 1) {
								setDebounceDelay(700);
							} else {
								setDebounceDelay(200);
							}
						}}
						className="h-12 px-4 py-0 text-base md:h-[55px] md:text-sm"
					/>
					<button
						type="button"
						aria-label="Close search"
						onClick={() => setOpen()}
						className="mr-2 inline-flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:hidden"
					>
						<Icons.X className="size-4" />
					</button>
				</div>
				{isFetching ? (
					<div className="absolute bottom-0 h-[2px] w-full overflow-hidden">
						<div className="absolute top-[1px] h-full w-40 animate-slide-effect bg-gradient-to-r dark:from-gray-800 dark:via-white dark:via-80% dark:to-gray-800 from-gray-200 via-black via-80% to-gray-200" />
					</div>
				) : null}
			</div>

			<div className="global-search-list min-h-0 flex-1 px-2" ref={listRef}>
				<CommandList
					ref={listHeightRef}
					className="scrollbar-hide max-h-none h-full"
				>
					{!searchValue.trim() ? (
						<CommandGroup heading="Quick links">
							{quickLinks.map((item) => (
								<QuickLinkItemDisplay
									key={item.id}
									item={item}
									onSelect={openHref}
								/>
							))}
						</CommandGroup>
					) : null}

					{!isLoading && combinedData.length === 0 && searchValue.trim() ? (
						<CommandEmpty>
							No results found for "{searchValue}".
						</CommandEmpty>
					) : null}

					{!isLoading && searchValue.trim()
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
