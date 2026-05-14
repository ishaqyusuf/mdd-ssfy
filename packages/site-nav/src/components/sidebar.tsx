import { cn } from "@gnd/ui/cn";
import { useEffect, useRef } from "react";
import { NavsList } from "./navs-list";
import { useSiteNav } from "./use-site-nav";

export function Sidebar({ children }: { children?: React.ReactNode }) {
	const ctx = useSiteNav();
	const { isExpanded, mainMenuRef, setIsExpanded, linkModules } = ctx;
	const expandTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		return () => {
			if (expandTimeoutRef.current) {
				clearTimeout(expandTimeoutRef.current);
			}
		};
	}, []);
	if (linkModules?.noSidebar) return null;
	return (
		<aside
			className={cn(
				"bg-sidebar text-sidebar-foreground fixed top-0 z-50 hidden h-screen flex-shrink-0 flex-col justify-between overflow-hidden border-r border-sidebar-border shadow-[0_1px_2px_rgba(15,23,42,0.04),0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] md:flex desktop:rounded-bl-lg desktop:rounded-tl-lg",
				isExpanded ? "w-[268px]" : "w-[84px]",
			)}
		>
			<div className="pointer-events-none absolute inset-0">
				<div className="absolute inset-x-5 top-[70px] h-px bg-sidebar-border/80" />
				<div className="absolute inset-y-0 right-0 w-px bg-sidebar-border/70" />
				<div className="absolute left-0 top-0 h-full w-1 bg-sidebar-primary" />
			</div>
			<div
				ref={mainMenuRef}
				onMouseEnter={() => {
					if (expandTimeoutRef.current) {
						clearTimeout(expandTimeoutRef.current);
					}
					expandTimeoutRef.current = setTimeout(() => {
						setIsExpanded(true);
						expandTimeoutRef.current = null;
					}, 140);
				}}
				onMouseLeave={() => {
					if (expandTimeoutRef.current) {
						clearTimeout(expandTimeoutRef.current);
						expandTimeoutRef.current = null;
					}
					setIsExpanded(false);
				}}
				className="scrollbar-hide relative flex min-h-0 w-full flex-1 flex-col overflow-y-auto pb-[124px] pt-[70px]"
			>
				<NavsList />
			</div>
			{children}
		</aside>
	);
}
