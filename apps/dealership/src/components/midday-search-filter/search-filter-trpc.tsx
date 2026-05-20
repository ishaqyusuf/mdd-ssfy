"use client";

import { useDebounce } from "@/hooks/use-debounce";
import { useSearchFilterContext } from "@/hooks/use-search-filter";
import type { PageFilterData } from "@api/type";
import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuPortal,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";
import { Icons } from "@gnd/ui/icons";
import { Input } from "@gnd/ui/input";
import { useEffect, useMemo, useRef, useState } from "react";

type FilterOption = {
	label: string;
	value: string;
	color?: string;
};

type FilterDefinition = {
	key: string;
	label: string;
	type?: string;
	options?: FilterOption[];
};

type Props = {
	placeholder?: string;
	filterList?: PageFilterData[];
	commitMode?: "submit" | "debounced" | "immediate";
	debounceMs?: number;
	searchKey?: string;
};

function normalizeFilterDefinitions(filterList?: PageFilterData[]) {
	return (filterList || []).map((filter) => ({
		key: String(filter.value),
		label: String(filter.label),
		type: filter.type,
		options: (filter.options || []).map((option: any) =>
			typeof option === "string"
				? { label: option, value: option }
				: {
						label: String(option.label),
						value: String(option.value),
						color: option.color,
					},
		),
	})) satisfies FilterDefinition[];
}

function isSearchKey(key: string) {
	return key === "q" || key === "search";
}

export function SearchFilterTRPC({
	placeholder,
	filterList,
	searchKey: searchKeyProp,
	commitMode = "debounced",
	debounceMs = 400,
}: Props) {
	const inputRef = useRef<HTMLInputElement>(null);
	const {
		isOpen,
		setIsOpen,
		setIsFocused,
		filters,
		setFilters,
		clearAll,
		setSearch,
		optionSelected,
		isOptionSelected,
		searchKey: contextSearchKey,
	} = useSearchFilterContext();
	const definitions = useMemo(
		() => normalizeFilterDefinitions(filterList),
		[filterList],
	);
	const searchKey =
		searchKeyProp ||
		definitions.find((definition) => isSearchKey(definition.key))?.key ||
		contextSearchKey;
	const searchValue = filters?.[searchKey];
	const [prompt, setPrompt] = useState(
		typeof searchValue === "string" ? searchValue : "",
	);
	const debouncedPrompt = useDebounce(prompt, debounceMs);
	const hasMounted = useRef(false);
	const nonSearchDefinitions = definitions.filter(
		(definition) => !isSearchKey(definition.key),
	);
	const hasValidFilters = Object.entries(filters || {}).some(([key, value]) => {
		if (isSearchKey(key)) return false;
		if (value === null || value === undefined || value === "") return false;
		if (Array.isArray(value)) return value.length > 0;
		return true;
	});

	useEffect(() => {
		const nextPrompt = typeof searchValue === "string" ? searchValue : "";
		setPrompt((currentPrompt) =>
			currentPrompt === nextPrompt ? currentPrompt : nextPrompt,
		);
	}, [searchValue]);

	useEffect(() => {
		if (commitMode !== "debounced") return;
		if (!hasMounted.current) {
			hasMounted.current = true;
			return;
		}
		setSearch(debouncedPrompt.length > 0 ? debouncedPrompt : null);
	}, [commitMode, debouncedPrompt, setSearch]);

	function handleSearch(evt: React.ChangeEvent<HTMLInputElement>) {
		const value = evt.target.value;
		setPrompt(value);

		if (commitMode === "immediate") {
			setSearch(value.length > 0 ? value : null);
			return;
		}

		if (!value) {
			setSearch(null);
		}
	}

	function handleSubmit(evt?: React.FormEvent) {
		evt?.preventDefault();
		setSearch(prompt.length > 0 ? prompt : null);
	}

	return (
		<DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
			<div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
				<form className="relative w-full lg:w-auto" onSubmit={handleSubmit}>
					<Icons.Search className="pointer-events-none absolute left-3 top-[11px] size-4" />
					<Input
						ref={inputRef}
						aria-label={placeholder || "Search"}
						placeholder={placeholder}
						className="w-full pl-9 pr-24 lg:w-[350px] lg:pr-10"
						value={prompt}
						onChange={handleSearch}
						onFocus={() => setIsFocused(true)}
						onBlur={() => setIsFocused(false)}
						autoComplete="off"
						autoCapitalize="none"
						autoCorrect="off"
						spellCheck="false"
					/>
					<DropdownMenuTrigger asChild>
						<Button
							aria-expanded={isOpen}
							aria-label="Open filters"
							onClick={() => setIsOpen((prev) => !prev)}
							type="button"
							variant="ghost"
							size="sm"
							className={cn(
								"absolute right-1 top-1 z-10 h-8 gap-1.5 rounded-md px-2 text-muted-foreground opacity-70 transition-opacity duration-300 hover:opacity-100 lg:w-8 lg:px-0",
								hasValidFilters && "opacity-100",
								isOpen && "opacity-100",
							)}
						>
							<Icons.Filter className="size-4" />
							<span className="text-xs lg:hidden">Filters</span>
						</Button>
					</DropdownMenuTrigger>
				</form>
				{hasValidFilters ? (
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={() => {
							clearAll();
							setPrompt("");
						}}
					>
						Clear filters
					</Button>
				) : null}
			</div>
			<DropdownMenuContent
				className={cn("w-[min(22rem,calc(100vw-2rem))] lg:w-[350px]")}
				sideOffset={4}
				alignOffset={0}
				side="bottom"
				align="end"
			>
				{nonSearchDefinitions.map((definition) => (
					<DropdownMenuGroup key={definition.key}>
						<DropdownMenuSub>
							<DropdownMenuSubTrigger>
								<Icons.Search className="mr-2 size-4" />
								<span className="capitalize">{definition.label}</span>
							</DropdownMenuSubTrigger>
							<DropdownMenuPortal>
								<DropdownMenuSubContent
									sideOffset={14}
									alignOffset={-4}
									className="p-0"
								>
									{definition.options?.map((option) => (
										<DropdownMenuCheckboxItem
											checked={isOptionSelected(definition.key, option.value)}
											onSelect={(event) => event.preventDefault()}
											onCheckedChange={() => {
												optionSelected(definition.key, option);
											}}
											key={option.value}
										>
											<span>{option.label}</span>
										</DropdownMenuCheckboxItem>
									))}
								</DropdownMenuSubContent>
							</DropdownMenuPortal>
						</DropdownMenuSub>
					</DropdownMenuGroup>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
