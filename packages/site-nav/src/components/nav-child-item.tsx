/** @jsxImportSource react */

import { cn } from "@gnd/ui/cn";
import type { LinkItem } from "../lib/types";
import { NavLink } from "./nav-link";

export const NavChildItem = ({
	child,
	mobile,
	isActive,
	isExpanded,
	isParentHovered,
	hasActiveChild,
	isParentActive,
	onSelect,
	index,
}: {
	child: LinkItem;
	mobile: boolean;
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
			prefetch={false}
			href={child.targetHref || child.href}
			onClick={() => onSelect?.()}
			className="group block"
		>
			<div className="relative">
				<div
					className={cn(
						"ml-[42px] mr-[15px] flex items-center border-l border-sidebar-border/80 pl-4",
						mobile ? "h-11" : "h-[32px]",
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
							"font-medium transition-colors duration-200",
							mobile ? "text-sm" : "text-xs",
							"text-sidebar-foreground/50 group-hover:text-sidebar-foreground/88",
							"whitespace-nowrap overflow-hidden",
							isActive && "text-sidebar-primary font-semibold",
						)}
					>
						{child.name}
					</span>
				</div>
			</div>
		</NavLink>
	);
};
