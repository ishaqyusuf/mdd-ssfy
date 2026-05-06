import { cn, cva } from "@gnd/ui/cn";
import { Icon, Icons } from "@gnd/ui/icons";
import { Fragment, useEffect, useMemo, useState } from "react";
import type { NavLink } from "../lib/types";
import {
	getActiveLinkFromMap,
	isPathInLink,
	normalizeNavPath,
} from "../lib/utils";
import { NavItem } from "./nav-item";
import { useSiteNav } from "./use-site-nav";

const sectionLabel = cva("", {
	variants: {
		renderMode: {
			suppressed: "",
			default: "hidden",
			none: "hidden",
		},
	},
	defaultVariants: {
		renderMode: "default",
	},
});
export function NavsList({
	mobile = false,
	onSelect,
}: {
	mobile?: boolean;
	onSelect?: () => void;
}) {
	const {
		linkModules,
		activeLink,
		isExpanded: _isExpanded,
		props: { pathName: rawPathName },
	} = useSiteNav();
	const [expandedItem, setExpandedItem] = useState<string | null>(null);
	const isExpanded = _isExpanded || mobile;
	const [expandModule, setExpandModule] = useState<string | null>(null);
	const [stableModuleName, setStableModuleName] = useState<string | null>(null);
	const [stableLinkModules, setStableLinkModules] = useState(linkModules);
	const renderedLinkModules =
		(linkModules?.modules?.length || 0) > 0
			? linkModules
			: stableLinkModules || linkModules;
	const normalizedPathName = useMemo(() => {
		return normalizeNavPath(rawPathName?.toLocaleLowerCase() || "");
	}, [rawPathName]);
	const currentModuleName = useMemo(() => {
		const pathName = normalizedPathName;
		if (!pathName) return null;

		const activeFromMap = getActiveLinkFromMap(
			pathName,
			renderedLinkModules?.linksNameMap || {},
		);
		if (
			typeof activeFromMap?.module === "string" &&
			activeFromMap.module.trim() !== ""
		) {
			return activeFromMap.module;
		}

		const firstSegment = pathName.split("/").filter(Boolean)[0]?.toLowerCase();
		if (firstSegment) {
			const moduleFromSegment = (renderedLinkModules?.modules || []).find(
				(module) => {
					const moduleName = module?.name;
					if (typeof moduleName !== "string" || !moduleName.trim())
						return false;
					const normalizedModule = moduleName
						.toLowerCase()
						.replace(/\s+/g, "-")
						.trim();
					return (
						normalizedModule === firstSegment ||
						firstSegment.startsWith(`${normalizedModule}-`) ||
						normalizedModule.startsWith(`${firstSegment}-`)
					);
				},
			);
			if (
				typeof moduleFromSegment?.name === "string" &&
				moduleFromSegment.name.trim() !== ""
			) {
				return moduleFromSegment.name;
			}
		}
		return typeof activeLink?.module === "string" &&
			activeLink.module.trim() !== ""
			? activeLink.module
			: null;
	}, [
		normalizedPathName,
		renderedLinkModules?.linksNameMap,
		renderedLinkModules?.modules,
		activeLink?.module,
	]);
	const effectiveModuleName =
		currentModuleName ||
		(typeof activeLink?.module === "string" && activeLink.module.trim() !== ""
			? activeLink.module
			: null);
	const visibleModuleName = effectiveModuleName || stableModuleName;
	const isLinkActive = (link: NavLink) => {
		if (!link || !normalizedPathName) return false;
		if (isPathInLink(normalizedPathName, link)) return true;
		return (link?.subLinks || []).some((subLink) =>
			isPathInLink(normalizedPathName, subLink),
		);
	};
	useEffect(() => {
		if (!effectiveModuleName) return;
		setStableModuleName((prev) =>
			prev === effectiveModuleName ? prev : effectiveModuleName,
		);
	}, [effectiveModuleName]);
	useEffect(() => {
		if ((linkModules?.modules?.length || 0) === 0) return;
		setStableLinkModules(linkModules);
	}, [linkModules]);
	useEffect(() => {
		if (!isExpanded) return;
		setExpandModule(visibleModuleName);
	}, [isExpanded, visibleModuleName]);
	return (
		<div className="mt-3 w-full px-3">
			<nav className="w-full overflow-auto">
				<div className="flex flex-col gap-2">
					{renderedLinkModules?.modules.map((module, mi) => {
						if (isExpanded && !module?.activeLinkCount) return null;
						const hasModuleTitle = Boolean(module?.name?.trim());
						const isActiveModule = visibleModuleName === module?.name;
						const isExpandedModule =
							hasModuleTitle && expandModule === module.name;
						const showExpandedState =
							isExpanded &&
							(!hasModuleTitle ||
								isExpandedModule ||
								(!visibleModuleName && !hasModuleTitle));
						const showCollapsedState =
							!isExpanded && (!hasModuleTitle || isActiveModule);
						const show = showExpandedState || showCollapsedState;
						return (
							<Fragment key={module?.name || `module-${mi}`}>
								{hasModuleTitle ? (
									<button
										type="button"
										onClick={() => {
											setExpandModule(isExpandedModule ? null : module.name);
										}}
										className={cn(
											"group hover:bg-sidebar-accent/55 focus-visible:ring-sidebar-ring mb-1.5 flex h-8 w-full cursor-pointer select-none items-center justify-between gap-2 rounded-lg px-2.5 text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2",
											isExpandedModule &&
												"bg-sidebar-accent text-sidebar-foreground",
											!isExpanded && "hidden",
										)}
										aria-expanded={show}
									>
										<div className="min-w-0 flex-1">
											<span
												className={cn(
													"text-sidebar-foreground/72 group-hover:text-sidebar-foreground block truncate text-[12px] font-medium tracking-[0.01em]",
													isExpandedModule &&
														"text-sidebar-foreground font-semibold",
												)}
											>
												{module.name}
											</span>
										</div>
										<Icons.ChevronDown
											className={cn(
												"text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70 size-3.5 transition-transform duration-200",
												isExpandedModule && "text-sidebar-foreground/80",
												show ? "" : "-rotate-90",
											)}
										/>
									</button>
								) : null}
								<div
									className={cn(
										"overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out",
										show
											? "max-h-[3000px] opacity-100"
											: "pointer-events-none max-h-0 opacity-0",
									)}
								>
									{module?.sections?.map((section, si) => (
										<div
											key={section?.name || section?.title || `section-${si}`}
											className={cn(!section?.linksCount && "hidden")}
										>
											{!isExpanded && si > 0 ? null : (
												<div
													className={cn(
														"text-sidebar-foreground/38 mx-4 mt-4 hidden text-[10px] font-semibold uppercase tracking-[0.18em]",
														activeLink?.module !== module.name &&
															sectionLabel({
																renderMode: isExpanded
																	? "default"
																	: "suppressed",
															}),
														!section?.title &&
															!section?.name &&
															(si > 0 || !module?.name) &&
															"hidden",
														isExpanded && si > 0 && "block",
													)}
												>
													{si === 0 && !isExpanded
														? module.name
														: section?.title || section.name}
												</div>
											)}
											<div>
												{section?.links
													?.filter((l) => l?.show)
													?.map((link, li) => (
														<Fragment
															key={link?.href || link?.name || `link-${li}`}
														>
															<NavItem
																isExpanded={isExpanded}
																isItemExpanded={expandedItem === link.href}
																onSelect={onSelect}
																onToggle={(path) => {
																	setExpandedItem(
																		expandedItem === path ? null : path,
																	);
																}}
																item={link}
																module={module}
																isActive={isLinkActive(link)}
															/>
														</Fragment>
													))}
											</div>
										</div>
									))}
								</div>
							</Fragment>
						);
					})}
				</div>
			</nav>
		</div>
	);
}
