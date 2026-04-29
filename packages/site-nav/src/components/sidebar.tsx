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
				"bg-sidebar text-sidebar-foreground fixed top-0 z-50 hidden h-screen flex-shrink-0 flex-col justify-between overflow-hidden border-r border-sidebar-border shadow-xl backdrop-blur-xl transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] md:flex desktop:rounded-bl-[24px] desktop:rounded-tl-[24px]",
				isExpanded ? "w-[272px]" : "w-[84px]",
			)}
		>
			<div className="pointer-events-none absolute inset-0">
				<div className="from-sidebar-primary/18 absolute inset-x-0 top-0 h-40 bg-gradient-to-b to-transparent" />
				<div className="bg-sidebar-border absolute inset-x-6 top-[70px] h-px" />
				<div className="bg-sidebar-border/70 absolute inset-y-0 right-0 w-px" />
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
