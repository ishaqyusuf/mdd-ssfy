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
						: "no-drag relative flex size-10 shrink-0 justify-center rounded-full border-border/70 bg-background/80 p-0 text-xs font-normal text-muted-foreground shadow-sm hover:bg-accent/60 xl:h-auto xl:size-auto xl:min-w-[250px] xl:flex-1 xl:justify-start xl:rounded-md xl:border-0 xl:bg-transparent xl:p-0 xl:pr-12 xl:text-sm xl:shadow-none xl:hover:bg-transparent"
				}
				onClick={() => {
					onOpen?.();
					openSearch();
				}}
			>
				<Icons.Search
					size={18}
					className={isMenuItem ? "shrink-0" : "shrink-0 xl:mr-2"}
				/>
				<span className={isMenuItem ? "truncate" : "hidden truncate xl:inline"}>
					{isMenuItem ? "Search" : "Find anything..."}
				</span>
				{isMenuItem ? null : (
					<kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-5 select-none items-center gap-1 border bg-accent px-1.5 font-mono text-[10px] font-medium opacity-0 hover:opacity-100 xl:flex">
						<span className="text-xs">⌘</span>K
					</kbd>
				)}
			</Button>
		</SuperAdminGuard>
	);
}
