import { cn } from "@gnd/ui/cn";
import {
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
} from "@gnd/ui/dropdown-menu";
import { Icon, Icons } from "@gnd/ui/icons";
import { useSiteNav } from "./use-site-nav";

export function ModuleMenuItems({
	showLabel = true,
	onSelect,
}: {
	showLabel?: boolean;
	onSelect?: () => void;
}) {
	const { modules, currentModule, selectModule } = useSiteNav();

	if (!modules.length) return null;

	return (
		<DropdownMenuGroup>
			{showLabel ? (
				<DropdownMenuLabel className="px-2 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/45">
					Modules
				</DropdownMenuLabel>
			) : null}
			{modules.map((module) => {
				const isCurrent = module.name === currentModule?.name;
				const content = (
					<>
						<Icon
							name={module.icon}
							className="mr-2.5 size-4 shrink-0 text-sidebar-foreground/65"
						/>
						<span className="min-w-0 flex-1 truncate">{module.name}</span>
						<Icons.Check
							className={cn(
								"ml-3 size-4 shrink-0",
								isCurrent ? "opacity-100" : "opacity-0",
							)}
						/>
					</>
				);

				return (
					<DropdownMenuItem
						key={module.name}
						onSelect={() => {
							selectModule(module.name);
							onSelect?.();
						}}
						className={cn(
							"cursor-pointer text-sidebar-foreground focus:bg-sidebar-accent focus:text-sidebar-foreground",
							isCurrent && "bg-sidebar-accent font-medium",
						)}
					>
						{content}
					</DropdownMenuItem>
				);
			})}
		</DropdownMenuGroup>
	);
}
