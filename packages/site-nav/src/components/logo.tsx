import { cn } from "@gnd/ui/cn";
import type { ComponentType } from "react";
import { useSiteNav } from "./use-site-nav";

interface SiteNavLogoProps {
	Icon?: ComponentType;
	href?: string;
	className?: string;
	title?: string;
	subtitle?: string;
}

function BaseLogo({
	Icon,
	href = "/",
	className,
	title,
	subtitle,
	expandedOnly = false,
	collapsedOnly = false,
}: SiteNavLogoProps & { expandedOnly?: boolean; collapsedOnly?: boolean }) {
	const {
		isExpanded,
		props: { Link },
	} = useSiteNav();

	if (expandedOnly && !isExpanded) return null;
	if (collapsedOnly && isExpanded) return null;

	const content = Icon ? (
		<span className="inline-flex shrink-0 items-center [&_img]:block">
			<Icon />
		</span>
	) : (
		<span className="text-xs">Logo</span>
	);

	return (
		<div
			className={cn(
				"absolute left-0 top-0 z-[999] flex h-[70px] items-center border-b border-sidebar-border/80 bg-sidebar transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
				isExpanded ? "w-full justify-start px-5" : "w-[83px] justify-center",
				className,
			)}
		>
			<div className="pointer-events-none absolute inset-x-5 bottom-0 h-px bg-white/70" />
			{Link ? (
				<Link
					href={href}
					className={cn(
						"relative z-10 inline-flex min-w-0 items-center",
						isExpanded ? "gap-3" : "justify-center",
					)}
				>
					{content}
					{isExpanded && title ? (
						<div className="flex min-w-0 flex-col leading-none">
							<span className="truncate text-[22px] font-extrabold tracking-normal text-sidebar-foreground">
								{title}
							</span>
							{subtitle ? (
								<span className="mt-1 truncate text-xs font-semibold tracking-normal text-sidebar-foreground/80">
									{subtitle}
								</span>
							) : null}
						</div>
					) : null}
				</Link>
			) : (
				<a
					href={href}
					className={cn(
						"relative z-10 inline-flex min-w-0 items-center",
						isExpanded ? "gap-3" : "justify-center",
					)}
				>
					{content}
					{isExpanded && title ? (
						<div className="flex min-w-0 flex-col leading-none">
							<span className="truncate text-[22px] font-extrabold tracking-normal text-sidebar-foreground">
								{title}
							</span>
							{subtitle ? (
								<span className="mt-1 truncate text-xs font-semibold tracking-normal text-sidebar-foreground/80">
									{subtitle}
								</span>
							) : null}
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
