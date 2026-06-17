import { cn } from "@gnd/ui/cn";
import { Icons } from "@gnd/ui/icons";
import { Icon } from "@gnd/ui/icons";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { NavLink as NavLinkType, NavModule } from "../lib/types";
import { isPathInLink, normalizeNavPath } from "../lib/utils";
import { NavChildItem } from "./nav-child-item";
import { NavLink } from "./nav-link";
import { useSiteNav } from "./use-site-nav";

const HOVER_EXPAND_DELAY_MS = 1000;
const HOVER_COLLAPSE_DELAY_MS = 1000;

export interface NavItemProps {
	module: NavModule;
	item: NavLinkType;
	isActive: boolean;
	isExpanded: boolean;
	isItemExpanded: boolean;
	onToggle: (path: string) => void;
	onSelect?: () => void;
	scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
}

export const NavItem = ({
	item,
	isActive,
	isExpanded,
	isItemExpanded,
	onSelect,
	onToggle,
	scrollContainerRef,
}: NavItemProps) => {
	const {
		props: { pathName },
	} = useSiteNav();
	const normalizedPathName = normalizeNavPath(
		pathName?.toLocaleLowerCase() || "",
	);
	const hasChildren = item.subLinks && item.subLinks.length > 0;
	const [isHovered, setIsHovered] = useState(false);
	const expandTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const collapseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
		null,
	);
	const resetPreserveFrameRef = useRef<number | null>(null);
	const childContainerRef = useRef<HTMLDivElement>(null);
	const pendingScrollCompensationRef = useRef<number | null>(null);
	const [isPreservingDownwardCollapse, setIsPreservingDownwardCollapse] =
		useState(false);
	const childLinks = (item.subLinks ?? []).filter((child) => !child.meta);

	const hasActiveChild = hasChildren
		? childLinks.some((child) => isPathInLink(normalizedPathName, child))
		: false;
	const shouldShowChildren =
		isExpanded && (isHovered || isItemExpanded || hasActiveChild || isActive);

	const clearExpandTimeout = () => {
		if (!expandTimeoutRef.current) return;
		clearTimeout(expandTimeoutRef.current);
		expandTimeoutRef.current = null;
	};

	const clearCollapseTimeout = () => {
		if (!collapseTimeoutRef.current) return;
		clearTimeout(collapseTimeoutRef.current);
		collapseTimeoutRef.current = null;
	};

	useEffect(() => {
		return () => {
			if (expandTimeoutRef.current) {
				clearTimeout(expandTimeoutRef.current);
			}
			if (collapseTimeoutRef.current) {
				clearTimeout(collapseTimeoutRef.current);
			}
			if (resetPreserveFrameRef.current) {
				cancelAnimationFrame(resetPreserveFrameRef.current);
			}
		};
	}, []);

	useLayoutEffect(() => {
		if (!isPreservingDownwardCollapse || shouldShowChildren) return;
		const collapsedHeight = pendingScrollCompensationRef.current ?? 0;
		pendingScrollCompensationRef.current = null;
		const scrollContainer = scrollContainerRef?.current;
		if (scrollContainer && collapsedHeight > 0) {
			scrollContainer.scrollTop = Math.max(
				0,
				scrollContainer.scrollTop - collapsedHeight,
			);
		}
		if (resetPreserveFrameRef.current) {
			cancelAnimationFrame(resetPreserveFrameRef.current);
		}
		resetPreserveFrameRef.current = requestAnimationFrame(() => {
			setIsPreservingDownwardCollapse(false);
			resetPreserveFrameRef.current = null;
		});
	}, [isPreservingDownwardCollapse, scrollContainerRef, shouldShowChildren]);

	const handleMouseEnter = () => {
		clearCollapseTimeout();
		if (hasChildren && !hasActiveChild && !isActive) {
			clearExpandTimeout();
			expandTimeoutRef.current = setTimeout(() => {
				setIsHovered(true);
				expandTimeoutRef.current = null;
			}, HOVER_EXPAND_DELAY_MS);
		} else {
			setIsHovered(true);
		}
	};

	const getChildBlockLayoutHeight = () => {
		const childContainer = childContainerRef.current;
		if (!childContainer) return 0;
		const childRect = childContainer.getBoundingClientRect();
		const childStyle = window.getComputedStyle(childContainer);
		return childRect.height + Number.parseFloat(childStyle.marginTop || "0");
	};

	const handleMouseLeave = (event: React.MouseEvent<HTMLDivElement>) => {
		clearExpandTimeout();
		clearCollapseTimeout();

		const childRect = childContainerRef.current?.getBoundingClientRect();
		const collapsedHeight = getChildBlockLayoutHeight();
		const willCollapseOnLeave =
			isHovered && !isItemExpanded && !hasActiveChild && !isActive;
		const isLeavingDownward =
			willCollapseOnLeave && childRect
				? event.clientY >= childRect.bottom - 1
				: false;

		collapseTimeoutRef.current = setTimeout(() => {
			const scrollTop = scrollContainerRef?.current?.scrollTop ?? 0;
			if (
				isLeavingDownward &&
				collapsedHeight > 0 &&
				scrollTop >= collapsedHeight
			) {
				pendingScrollCompensationRef.current = collapsedHeight;
				setIsPreservingDownwardCollapse(true);
			}
			setIsHovered(false);
			collapseTimeoutRef.current = null;
		}, HOVER_COLLAPSE_DELAY_MS);
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
					ref={childContainerRef}
					className={cn(
						"overflow-hidden",
						!isPreservingDownwardCollapse &&
							"transition-all duration-300 ease-in-out",
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
								isParentHovered={
									isHovered || isItemExpanded || hasActiveChild || isActive
								}
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
