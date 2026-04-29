import { cn } from "@gnd/ui/cn";
import type { LinkItem } from "../lib/types";
import { NavLink } from "./nav-link";

export const NavChildItem = ({
	child,
	isActive,
	isExpanded,
	isParentHovered,
	hasActiveChild,
	isParentActive,
	onSelect,
	index,
}: {
	child: LinkItem;
	isActive: boolean;
	isExpanded: boolean;
	isParentHovered: boolean;
	hasActiveChild: boolean;
	isParentActive: boolean;
	onSelect?: () => void;
	index: number;
}) => {
	const showChild = isExpanded && isParentHovered;
	const shouldSkipAnimation = hasActiveChild || isParentActive;

	return (
		<NavLink
			prefetch
			href={child.href}
			onClick={() => onSelect?.()}
			className="group"
		>
			<div className="relative">
				<div
					className={cn(
						"border-sidebar-border ml-[42px] mr-[15px] flex h-[34px] items-center border-l pl-4",
						!shouldSkipAnimation && "transition-all duration-300 ease-in-out",
						showChild
							? "opacity-100 translate-x-0"
							: "opacity-0 -translate-x-2",
					)}
					style={{
						transitionDelay: shouldSkipAnimation
							? undefined
							: showChild
								? `${60 + index * 25}ms`
								: `${(2 - index) * 10}ms`,
					}}
				>
					<span
						className={cn(
							"text-xs font-medium transition-colors duration-200",
							"text-sidebar-foreground/50 group-hover:text-sidebar-foreground/88",
							"whitespace-nowrap overflow-hidden",
							isActive && "text-sidebar-primary",
						)}
					>
						{child.name}
					</span>
				</div>
			</div>
		</NavLink>
	);
};
