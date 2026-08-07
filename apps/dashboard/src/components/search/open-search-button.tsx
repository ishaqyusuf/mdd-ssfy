"use client";

import { useSearchStore } from "@/store/search";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { SuperAdminGuard } from "../auth-guard";

type OpenSearchButtonProps = {
	presentation?: "header" | "menu-item";
	onOpen?: () => void;
};

export function OpenSearchButton({
	presentation = "header",
	onOpen,
}: OpenSearchButtonProps = {}) {
	const openSearch = useSearchStore((state) => state.openSearch);
	const isMenuItem = presentation === "menu-item";

	return (
		<SuperAdminGuard>
			<Button
				variant={isMenuItem ? "ghost" : "outline"}
				aria-label="Search"
				className={
					isMenuItem
						? "h-11 w-full justify-start gap-3 rounded-lg px-3 text-sm font-medium"
						: "no-drag relative flex size-10 shrink-0 justify-center rounded-full border-border/70 bg-background/80 p-0 text-xs font-normal text-muted-foreground shadow-sm hover:bg-accent/60 sm:h-auto sm:size-auto sm:min-w-[200px] lg:sm:min-w-[250px] sm:flex-1 sm:justify-start sm:rounded-md sm:border-0 sm:bg-transparent sm:p-0 sm:pr-12 sm:text-sm sm:shadow-none sm:hover:bg-transparent"
				}
				onClick={() => {
					onOpen?.();
					openSearch();
				}}
			>
				<Icons.Search
					size={18}
					className={isMenuItem ? "shrink-0" : "shrink-0 sm:mr-2"}
				/>
				<span className={isMenuItem ? "truncate" : "hidden truncate sm:inline"}>
					{isMenuItem ? "Search" : "Find anything..."}
				</span>
				{isMenuItem ? null : (
					<kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-5 select-none items-center gap-1 border bg-accent px-1.5 font-mono text-[10px] font-medium opacity-0 hover:opacity-100 sm:flex">
						<span className="text-xs">⌘</span>K
					</kbd>
				)}
			</Button>
		</SuperAdminGuard>
	);
}
