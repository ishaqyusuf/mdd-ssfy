import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";
import { Icon, Icons } from "@gnd/ui/icons";
import { useState } from "react";
import { ModuleMenuItems } from "./module-menu-items";
import { useSiteNav } from "./use-site-nav";

interface ModuleSelectorProps {
	forceExpanded?: boolean;
	expandNavOnOpen?: boolean;
}

export function ModuleSelector({
	forceExpanded = false,
	expandNavOnOpen = true,
}: ModuleSelectorProps = {}) {
	const {
		currentModule,
		isExpanded,
		expandSiteNav,
		handleNavFloatingMouseEnter,
		handleNavFloatingMouseLeave,
		modules,
	} = useSiteNav();
	const [open, setOpen] = useState(false);
	const showDetails = forceExpanded || isExpanded;

	if (!currentModule || modules.length === 0) return null;

	return (
		<DropdownMenu
			modal={false}
			open={open}
			onOpenChange={(nextOpen) => {
				setOpen(nextOpen);
				if (nextOpen && expandNavOnOpen) expandSiteNav();
			}}
		>
			<DropdownMenuTrigger asChild>
				<Button
					type="button"
					variant="ghost"
					aria-label="Select module"
					className={cn(
						"h-11 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent data-[state=open]:bg-sidebar-accent",
						showDetails
							? "w-full justify-start gap-3 px-3"
							: "w-11 justify-center px-0",
					)}
				>
					<Icon
						name={currentModule.icon}
						className="size-[18px] shrink-0 text-sidebar-primary"
					/>
					{showDetails ? (
						<>
							<span className="min-w-0 flex-1 text-left">
								<span className="block truncate text-sm font-semibold">
									{currentModule.name}
								</span>
								{currentModule.subtitle ? (
									<span className="block truncate text-[11px] font-normal text-sidebar-foreground/50">
										{currentModule.subtitle}
									</span>
								) : null}
							</span>
							<Icons.ChevronDown className="size-4 shrink-0 text-sidebar-foreground/45" />
						</>
					) : null}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				data-site-nav-hover-surface="true"
				onMouseEnter={expandNavOnOpen ? handleNavFloatingMouseEnter : undefined}
				onMouseLeave={expandNavOnOpen ? handleNavFloatingMouseLeave : undefined}
				align="start"
				side="bottom"
				sideOffset={7}
				className="w-[min(17rem,calc(100vw-2rem))] rounded-lg border-sidebar-border bg-sidebar text-sidebar-foreground shadow-[0_16px_42px_rgba(15,23,42,0.16)]"
			>
				<ModuleMenuItems showLabel={false} onSelect={() => setOpen(false)} />
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
