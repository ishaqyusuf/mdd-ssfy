import { cn } from "@gnd/ui/cn";
import type { ComponentType } from "react";
import { useSiteNav } from "./use-site-nav";

interface SiteNavLogoProps {
	Icon?: ComponentType;
	href?: string;
	className?: string;
}

function BaseLogo({
	Icon,
	href = "/",
	className,
	expandedOnly = false,
	collapsedOnly = false,
}: SiteNavLogoProps & { expandedOnly?: boolean; collapsedOnly?: boolean }) {
	const {
		isExpanded,
		props: { Link },
	} = useSiteNav();

	if (expandedOnly && !isExpanded) return null;
	if (collapsedOnly && isExpanded) return null;

	const content = Icon ? <Icon /> : <span className="text-xs">Logo</span>;

	return (
		<div
			className={cn(
				"bg-sidebar/95 absolute left-0 top-0 z-[999] flex h-[70px] items-center border-b border-sidebar-border shadow-sm backdrop-blur-xl transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
				isExpanded ? "w-full justify-start px-5" : "w-[83px] justify-center",
				className,
			)}
		>
			<div className="bg-sidebar-border pointer-events-none absolute inset-x-5 bottom-0 h-px" />
			{Link ? (
				<Link
					href={href}
					className={cn(
						"inline-flex items-center",
						isExpanded ? "gap-3" : "justify-center",
					)}
				>
					{content}
					{isExpanded ? (
						<div className="flex flex-col">
							<span className="text-sidebar-foreground/55 text-[11px] font-semibold uppercase tracking-[0.24em]">
								Workspace
							</span>
							<span className="text-sidebar-foreground text-sm font-semibold">
								Control Panel
							</span>
						</div>
					) : null}
				</Link>
			) : (
				<a
					href={href}
					className={cn(
						"inline-flex items-center",
						isExpanded ? "gap-3" : "justify-center",
					)}
				>
					{content}
					{isExpanded ? (
						<div className="flex flex-col">
							<span className="text-sidebar-foreground/55 text-[11px] font-semibold uppercase tracking-[0.24em]">
								Workspace
							</span>
							<span className="text-sidebar-foreground text-sm font-semibold">
								Control Panel
							</span>
						</div>
					) : null}
				</a>
			)}
		</div>
	);
}

export function Logo(props: SiteNavLogoProps) {
	return <BaseLogo {...props} expandedOnly />;
}

export function LogoSm(props: SiteNavLogoProps) {
	return <BaseLogo {...props} collapsedOnly />;
}
