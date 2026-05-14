import { cn } from "@gnd/ui/cn";
import { Icons } from "@gnd/ui/icons";
import { Icon } from "@gnd/ui/icons";
import { useRef, useState } from "react";
import type { NavLink as NavLinkType, NavModule } from "../lib/types";
import { isPathInLink, normalizeNavPath } from "../lib/utils";
import { NavChildItem } from "./nav-child-item";
import { NavLink } from "./nav-link";
import { useSiteNav } from "./use-site-nav";

const HOVER_EXPAND_DELAY_MS = 180;

export interface NavItemProps {
	module: NavModule;
	item: NavLinkType;
	isActive: boolean;
	isExpanded: boolean;
	isItemExpanded: boolean;
	onToggle: (path: string) => void;
	onSelect?: () => void;
}

export const NavItem = ({
	item,
	isActive,
	isExpanded,
	onSelect,
	onToggle,
}: NavItemProps) => {
	const {
		props: { pathName },
	} = useSiteNav();
	const normalizedPathName = normalizeNavPath(
		pathName?.toLocaleLowerCase() || "",
	);
	const hasChildren = item.subLinks && item.subLinks.length > 0;
	const [isHovered, setIsHovered] = useState(false);
	const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const childLinks = item.subLinks ?? [];

	const hasActiveChild = hasChildren
		? childLinks.some((child) => isPathInLink(normalizedPathName, child))
		: false;
	const shouldShowChildren =
		isExpanded && (isHovered || hasActiveChild || isActive);

	const handleMouseEnter = () => {
		if (hasChildren && !hasActiveChild && !isActive) {
			hoverTimeoutRef.current = setTimeout(() => {
				setIsHovered(true);
			}, HOVER_EXPAND_DELAY_MS);
		} else {
			setIsHovered(true);
		}
	};

	const handleMouseLeave = () => {
		if (hoverTimeoutRef.current) {
			clearTimeout(hoverTimeoutRef.current);
			hoverTimeoutRef.current = null;
		}
		setIsHovered(false);
	};

	const handleChevronClick = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		onToggle(item.href);
	};

	return (
		<div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
			<NavLink
				prefetch
				href={item.targetHref || item.href || ""}
				onClick={() => {
					if (item.href) onSelect?.();
				}}
				className="group"
			>
				<div className="relative">
					<div
						className={cn(
							"ml-[10px] mr-[10px] h-[42px] rounded-lg border transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
							isExpanded && isActive
								? "border-sidebar-border/90 bg-card shadow-[0_1px_2px_rgba(15,23,42,0.08),0_10px_28px_rgba(15,23,42,0.06)]"
								: "border-transparent bg-transparent",
							isExpanded &&
								!isActive &&
								"group-hover:border-sidebar-border/80 group-hover:bg-sidebar-accent/78",
							isExpanded ? "w-[calc(100%-20px)]" : "w-[42px]",
						)}
					/>

					{isExpanded && isActive && (
						<>
							<div className="absolute inset-y-[9px] left-[13px] w-[3px] rounded-full bg-sidebar-primary" />
						</>
					)}

					<div className="pointer-events-none absolute left-[10px] top-0 flex h-[42px] w-[42px] items-center justify-center text-sidebar-foreground/48 group-hover:text-sidebar-foreground/88">
						<div
							className={cn(
								"flex h-7 w-7 items-center justify-center rounded-md transition-colors duration-200",
								isActive &&
									"bg-sidebar-primary !text-white shadow-[0_6px_14px_rgba(15,23,42,0.14)] [&_svg]:!text-white",
							)}
						>
							<Icon name={item.icon} className={cn("h-4 w-4")} />
						</div>
					</div>

					{isExpanded && (
						<div className="pointer-events-none absolute left-[58px] right-[10px] top-0 flex h-[42px] items-center">
							<span
								className={cn(
									"overflow-hidden whitespace-nowrap text-sm font-medium text-sidebar-foreground/64 transition-colors duration-150 group-hover:text-sidebar-foreground",
									hasChildren ? "pr-2" : "",
									isActive && "text-sidebar-foreground font-semibold",
								)}
							>
								{item.name}
							</span>
							{hasChildren && (
								<button
									type="button"
									onClick={handleChevronClick}
									className={cn(
										"pointer-events-auto ml-auto mr-1 flex h-7 w-7 items-center justify-center rounded-lg border border-transparent text-sidebar-foreground/42 transition-all duration-200 hover:border-sidebar-border hover:bg-sidebar-accent hover:text-sidebar-foreground",
										isActive && "text-sidebar-primary",
										shouldShowChildren && "rotate-180",
									)}
								>
									<Icons.ChevronDown size={16} />
								</button>
							)}
						</div>
					)}
				</div>
			</NavLink>

			{hasChildren && (
				<div
					className={cn(
						"transition-all duration-300 ease-in-out overflow-hidden",
						shouldShowChildren ? "max-h-96 mt-1.5" : "max-h-0",
					)}
				>
					{childLinks.map((child, index) => {
						const isChildActive = isPathInLink(normalizedPathName, child);
						return (
							<NavChildItem
								key={child.href || child.name || `${item.href}-child-${index}`}
								child={child}
								isActive={isChildActive}
								isExpanded={isExpanded}
								isParentHovered={isHovered || hasActiveChild || isActive}
								hasActiveChild={hasActiveChild}
								isParentActive={isActive}
								onSelect={onSelect}
								index={index}
							/>
						);
					})}
				</div>
			)}
		</div>
	);
};
