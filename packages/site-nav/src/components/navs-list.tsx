import { Fragment, useEffect, useMemo, useState } from "react";
import { resolveVisibleNavModules } from "../lib/module-selection";
import type { NavLink } from "../lib/types";
import { isPathInLink, normalizeNavPath } from "../lib/utils";
import { NavItem } from "./nav-item";
import { useSiteNav } from "./use-site-nav";

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
		currentModule,
		mainMenuRef,
		isExpanded: desktopIsExpanded,
		props: { pathName: rawPathName },
	} = useSiteNav();
	const [expandedItem, setExpandedItem] = useState<string | null>(null);
	const [stableLinkModules, setStableLinkModules] = useState(linkModules);
	const isExpanded = desktopIsExpanded || mobile;
	const renderedLinkModules =
		(linkModules?.modules?.length || 0) > 0
			? linkModules
			: stableLinkModules || linkModules;
	const normalizedPathName = useMemo(
		() => normalizeNavPath(rawPathName?.toLocaleLowerCase() || ""),
		[rawPathName],
	);
	const visibleModules = useMemo(
		() =>
			resolveVisibleNavModules(
				renderedLinkModules?.modules || [],
				currentModule?.name,
				activeLink?.module,
			),
		[activeLink?.module, currentModule?.name, renderedLinkModules?.modules],
	);

	useEffect(() => {
		if ((linkModules?.modules?.length || 0) === 0) return;
		setStableLinkModules(linkModules);
	}, [linkModules]);

	const isLinkActive = (link: NavLink) => {
		if (!link || !normalizedPathName) return false;
		if (isPathInLink(normalizedPathName, link)) return true;
		return (link.subLinks || []).some((subLink) =>
			isPathInLink(normalizedPathName, subLink),
		);
	};

	if (!visibleModules.length) return null;

	return (
		<div className="w-full px-3 pt-3">
			<nav className="w-full">
				<div className="flex flex-col gap-2.5">
					{visibleModules.map((module, moduleIndex) => {
						const isFirstUnnamedModule =
							!module.name?.trim() &&
							visibleModules
								.slice(0, moduleIndex)
								.every((previousModule) => previousModule.name?.trim());

						return (
							<Fragment key={module.name || `module-${module.index}`}>
								{isFirstUnnamedModule ? (
									<div
										className="mx-1 my-1 h-px bg-sidebar-border/80"
										aria-hidden="true"
									/>
								) : null}
								{module.sections.map((section, sectionIndex) => {
									if (!section.linksCount) return null;
									const sectionTitle = section.title || section.name;

									return (
										<div
											key={
												section.name ||
												section.title ||
												`${module.index}-section-${sectionIndex}`
											}
										>
											{isExpanded && sectionTitle ? (
												<div className="mx-4 mb-1 mt-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/36">
													{sectionTitle}
												</div>
											) : null}
											<div>
												{section.links
													.filter((link) => link?.show)
													.map((link, linkIndex) => (
														<Fragment
															key={
																link?.href ||
																link?.name ||
																`${module.index}-link-${linkIndex}`
															}
														>
															<NavItem
																mobile={mobile}
																isExpanded={isExpanded}
																isItemExpanded={expandedItem === link?.href}
																onSelect={onSelect}
																onToggle={(path) => {
																	setExpandedItem((currentPath) =>
																		currentPath === path ? null : path,
																	);
																}}
																scrollContainerRef={mainMenuRef}
																item={link}
																module={module}
																isActive={isLinkActive(link)}
															/>
														</Fragment>
													))}
											</div>
										</div>
									);
								})}
							</Fragment>
						);
					})}
				</div>
			</nav>
		</div>
	);
}
