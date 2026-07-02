import { cn } from "@gnd/ui/cn";
import { NavsList } from "./navs-list";
import { useSiteNav } from "./use-site-nav";

export function Sidebar({ children }: { children?: React.ReactNode }) {
	const ctx = useSiteNav();
	const {
		isExpanded,
		mainMenuRef,
		linkModules,
		handleNavMouseEnter,
		handleNavMouseLeave,
	} = ctx;

	if (linkModules?.noSidebar) return null;
	return (
		<aside
			data-site-nav-hover-surface="true"
			onMouseEnter={handleNavMouseEnter}
			onMouseLeave={handleNavMouseLeave}
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
				className="scrollbar-hide relative flex min-h-0 w-full flex-1 flex-col overflow-y-auto pb-4 pt-[70px]"
			>
				<NavsList />
			</div>
			{children}
		</aside>
	);
}
