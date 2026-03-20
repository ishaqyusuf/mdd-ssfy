import { cn, cva } from "@gnd/ui/cn";
import { useSiteNav } from "./use-site-nav";

import { Fragment, useEffect, useMemo, useState } from "react";
import { Icons } from "@gnd/ui/icons";
import type { NavLink } from "../lib/types";
import { NavItem } from "./nav-item";

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
export function NavsList({ mobile = false }) {
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
    const normalizePath = (path = "") =>
      path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
    return normalizePath(rawPathName?.toLocaleLowerCase() || "");
  }, [rawPathName]);
  const currentModuleName = useMemo(() => {
    const normalizePath = (path = "") =>
      path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
    const pathName = normalizedPathName;
    if (!pathName) return null;
    const candidates: Array<{
      moduleName?: string;
      score: number;
      pathLength: number;
    }> = [];
    (renderedLinkModules?.modules || []).forEach((module) => {
      const moduleName = module?.name;
      const hasModuleName =
        typeof moduleName === "string" && moduleName.trim() !== "";
      const moduleBoost = hasModuleName ? 1 : 0;
      module?.sections?.forEach((section) => {
        section?.links?.forEach((link) => {
          if (!link?.show) return;
          const href = normalizePath(link?.href?.toLocaleLowerCase() || "");
          if (href && href === pathName) {
            candidates.push({
              moduleName,
              score: 4 + moduleBoost,
              pathLength: href.length,
            });
          }
          (link?.paths || []).forEach((partPath) => {
            const normalizedPart = normalizePath(
              partPath?.toLocaleLowerCase() || "",
            );
            if (!normalizedPart || !pathName.startsWith(normalizedPart)) return;
            candidates.push({
              moduleName,
              score: 2 + moduleBoost,
              pathLength: normalizedPart.length,
            });
          });
          (link?.subLinks || []).forEach((subLink) => {
            if (!subLink?.show) return;
            const subHref = normalizePath(
              subLink?.href?.toLocaleLowerCase() || "",
            );
            if (subHref && subHref === pathName) {
              candidates.push({
                moduleName,
                score: 4 + moduleBoost,
                pathLength: subHref.length,
              });
            }
            (subLink?.paths || []).forEach((partPath) => {
              const normalizedPart = normalizePath(
                partPath?.toLocaleLowerCase() || "",
              );
              if (!normalizedPart || !pathName.startsWith(normalizedPart)) return;
              candidates.push({
                moduleName,
                score: 2 + moduleBoost,
                pathLength: normalizedPart.length,
              });
            });
          });
        });
      });
    });
    const winner = candidates.sort((a, b) => {
      const byScore = b.score - a.score;
      if (byScore !== 0) return byScore;
      return b.pathLength - a.pathLength;
    })[0];
    if (
      typeof winner?.moduleName === "string" &&
      winner.moduleName.trim() !== ""
    ) {
      return winner.moduleName;
    }
    const firstSegment = pathName.split("/").filter(Boolean)[0]?.toLowerCase();
    if (firstSegment) {
      const moduleFromSegment = (renderedLinkModules?.modules || []).find((module) => {
        const moduleName = module?.name;
        if (typeof moduleName !== "string" || !moduleName.trim()) return false;
        const normalizedModule = moduleName
          .toLowerCase()
          .replace(/\s+/g, "-")
          .trim();
        return (
          normalizedModule === firstSegment ||
          firstSegment.startsWith(`${normalizedModule}-`) ||
          normalizedModule.startsWith(`${firstSegment}-`)
        );
      });
      if (
        typeof moduleFromSegment?.name === "string" &&
        moduleFromSegment.name.trim() !== ""
      ) {
        return moduleFromSegment.name;
      }
    }
    return typeof activeLink?.module === "string" && activeLink.module.trim() !== ""
      ? activeLink.module
      : null;
  }, [normalizedPathName, renderedLinkModules?.modules, activeLink?.module]);
  const effectiveModuleName =
    currentModuleName ||
    (typeof activeLink?.module === "string" && activeLink.module.trim() !== ""
      ? activeLink.module
      : null);
  const visibleModuleName = effectiveModuleName || stableModuleName;
  const isLinkActive = (link: NavLink) => {
    if (!link || !normalizedPathName) return false;
    const normalizePath = (path = "") =>
      path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
    const href = normalizePath(link?.href?.toLocaleLowerCase() || "");
    if (href && href === normalizedPathName) return true;
    const hasPartPath = (link?.paths || []).some((partPath) => {
      const normalizedPart = normalizePath(partPath?.toLocaleLowerCase() || "");
      return normalizedPart && normalizedPathName.startsWith(normalizedPart);
    });
    if (hasPartPath) return true;
    return (link?.subLinks || []).some((subLink) => {
      const subHref = normalizePath(subLink?.href?.toLocaleLowerCase() || "");
      if (subHref && subHref === normalizedPathName) return true;
      return (subLink?.paths || []).some((partPath) => {
        const normalizedPart = normalizePath(partPath?.toLocaleLowerCase() || "");
        return normalizedPart && normalizedPathName.startsWith(normalizedPart);
      });
    });
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
    setExpandModule(null);
  }, [_isExpanded]);
  useEffect(() => {
    if (!isExpanded) return;
    setExpandModule(visibleModuleName);
  }, [isExpanded, visibleModuleName]);
  return (
    <div className="mt-6 w-full">
      <nav className="w-full overflow-auto">
        <div className="flex flex-col gap-2">
          {renderedLinkModules?.modules
            .map((module, mi) => {
              if (isExpanded && !module?.activeLinkCount) return null;
              const hasModuleTitle = Boolean(module?.name?.trim());
              const isActiveModule = visibleModuleName == module?.name;
              const isExpandedModule =
                hasModuleTitle && expandModule === module.name;
              const showExpandedState =
                isExpanded &&
                (!hasModuleTitle || isExpandedModule || (!visibleModuleName && !hasModuleTitle));
              const showCollapsedState =
                !isExpanded &&
                (!hasModuleTitle || isActiveModule);
              const show = showExpandedState || showCollapsedState;
              return (
                <Fragment key={mi}>
                  {hasModuleTitle ? (
                    <div
                      onClick={() => {
                        setExpandModule(isExpandedModule ? null : module.name);
                      }}
                      className={cn(
                        "flex justify-between gap-2 items-center uppercase pl-3 text-[10px] tracking-[0.08em] font-semibold text-muted-foreground/50 cursor-pointer h-7 select-none",
                        !isExpanded && "hidden",
                        !mobile ? "pr-3" : "",
                      )}
                    >
                      <span>{module.name}</span>
                      <Icons.ChevronDown
                        className={cn(
                          "size-3 transition-transform duration-200",
                          show ? "" : "-rotate-90",
                        )}
                      />
                    </div>
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
                        key={si}
                        className={cn(!section?.linksCount && "hidden")}
                      >
                        {!isExpanded && si > 0 ? null : (
                          <div
                            className={cn(
                              "uppercase hidden text-xs mx-4 mt-4 font-semibold text-muted-foreground",
                              activeLink?.module != module.name &&
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
                            {si == 0 && !isExpanded
                              ? module.name
                              : section?.title || section.name}
                          </div>
                        )}
                        <div>
                          {section?.links
                            ?.filter((l) => l?.show)
                            ?.map((link, li) => (
                              <Fragment key={li}>
                                <NavItem
                                  isExpanded={isExpanded}
                                  isItemExpanded={expandedItem === link.href}
                                  onToggle={(path) => {
                                    setExpandedItem(
                                      expandedItem === path ? null : path,
                                    );
                                  }}
                                  item={link}
                                  key={li}
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
