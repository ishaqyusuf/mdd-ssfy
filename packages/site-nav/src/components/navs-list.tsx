import { cn, cva } from "@gnd/ui/cn";
import { useSiteNav } from "./use-site-nav";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Icons } from "@gnd/ui/icons";
import { Icon } from "@gnd/ui/icons";
import { LinkItem, NavLink, NavModule } from "../lib/utils";
// import {ChevronDown} from "lucide-icons"
interface Props {}

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
  const [collapseActiveModule, setCollapseActiveModule] = useState(false);
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
    setCollapseActiveModule(false);
  }, [_isExpanded]);
  useEffect(() => {
    if (!isExpanded) return;
    setCollapseActiveModule(false);
    // Expanded sidebar default: open the current module.
    setExpandModule(visibleModuleName);
  }, [isExpanded, visibleModuleName]);
  return (
    <div className="mt-6 w-full">
      <nav className="w-full overflow-auto">
        <div className="flex flex-col gap-2">
          {/* <span>{JSON.stringify({ activeLink })}</span> */}
          {renderedLinkModules?.modules
            // ?.filter((a) => a.activeLinkCount)
            .map((module, mi) => {
              if (isExpanded && !module?.activeLinkCount) return null;
              const hasModuleTitle = Boolean(module?.name?.trim());
              const isActiveModule = visibleModuleName == module?.name;
              const isExpandedModule =
                hasModuleTitle && expandModule === module.name;
              const showExpandedState =
                isExpanded &&
                (!hasModuleTitle ||
                  isExpandedModule ||
                  (isActiveModule && !collapseActiveModule) ||
                  (!visibleModuleName && !hasModuleTitle));
              const showCollapsedState =
                !isExpanded &&
                (!hasModuleTitle || isActiveModule);
              const show = showExpandedState || showCollapsedState;
              return (
                <Fragment key={mi}>
                  {hasModuleTitle ? (
                    <div
                      onClick={() => {
                        if (isActiveModule && expandModule === null) {
                          setCollapseActiveModule((prev) => !prev);
                          return;
                        }
                        setCollapseActiveModule(false);
                        setExpandModule((prev) =>
                          prev === module.name ? null : module.name,
                        );
                      }}
                      className={cn(
                        "flex justify-between  gap-2 items-center uppercase pl-4 text-sm text-xs font-bold text-muted-foreground cursor-pointer h-8",
                        !isExpanded && "hidden",
                        !mobile ? "pr-4" : "",
                        isExpanded && !show && "border-b border-muted",
                      )}
                    >
                      <span>{module.name}</span>
                      <Icons.ChevronDown
                        className={cn(
                          "size-4",
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
                                {/* {link?.subLinks?.length ? } */}
                                <Item
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
                                  // onSelect={onSelect}
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
interface ItemProps {
  // item: {
  //     path: string;
  //     name: string;
  //     children?: { path: string; name: string }[];
  // };
  module: NavModule;
  item: NavLink;

  isActive: boolean;
  isExpanded: boolean;
  isItemExpanded: boolean;
  onToggle: (path: string) => void;
  onSelect?: () => void;
}
const Link = (props) => {
  const { props: _props } = useSiteNav();
  const Lnk = _props.Link;
  if (Lnk) return <Lnk {...props} />;
  return <a {...props}>{props.children}</a>;
};
const ChildItem = ({
  child,
  isActive,
  isExpanded,
  isParentHovered,
  hasActiveChild,
  isParentActive,
  onSelect,
  index,
}: {
  child: LinkItem; //{ path: string; name: string };
  isActive: boolean;
  isExpanded: boolean;
  isParentHovered: boolean;
  hasActiveChild: boolean;
  isParentActive: boolean;
  onSelect?: () => void;
  index: number;
}) => {
  const showChild = isExpanded && isParentHovered;
  const shouldSkipAnimation = hasActiveChild || isParentActive;

  return (
    <Link
      prefetch
      href={child.href}
      onClick={() => onSelect?.()}
      className="group"
    >
      <div className="relative">
        {/* Child item text */}
        <div
          className={cn(
            "ml-[35px] mr-[15px] h-[32px] flex items-center",
            "border-l border-[#DCDAD2] dark:border-[#2C2C2C] pl-3",
            !shouldSkipAnimation && "transition-all duration-300 ease-in-out",
            showChild
              ? "opacity-100 translate-x-0"
              : "opacity-0 -translate-x-2",
          )}
          style={{
            transitionDelay: shouldSkipAnimation
              ? undefined
              : showChild
                ? `${60 + index * 25}ms`
                : `${(2 - index) * 10}ms`,
          }}
        >
          <span
            className={cn(
              "text-xs font-medium transition-colors duration-200",
              "text-[#888] group-hover:text-primary",
              "whitespace-nowrap overflow-hidden",
              isActive && "text-primary",
            )}
          >
            {child.name}
          </span>
        </div>
      </div>
    </Link>
  );
};

const Item = ({
  item,
  isActive,
  isExpanded,
  onSelect,
  onToggle,
}: ItemProps) => {
  // const Icon = item.icon
  const {
    props: { pathName },
  } = useSiteNav();
  const hasChildren = item.subLinks && item.subLinks.length > 0;
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check if any child is currently active
  const hasActiveChild = hasChildren
    ? item.subLinks!.some((child) => pathName === child.href)
    : false;
  const shouldShowChildren =
    isExpanded && (isHovered || hasActiveChild || isActive);

  const handleMouseEnter = () => {
    if (hasChildren && !hasActiveChild && !isActive) {
      hoverTimeoutRef.current = setTimeout(() => {
        setIsHovered(true);
      }, 250);
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
      <Link
        prefetch
        href={item.href || ""}
        onClick={() => onSelect?.()}
        className="group"
      >
        <div className="relative">
          {/* Background that expands */}
          <div
            className={cn(
              "border border-transparent h-[40px] transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] ml-[15px] mr-[15px]",
              isActive &&
                "bg-[#F2F1EF] dark:bg-secondary border-[#DCDAD2] dark:border-[#2C2C2C]",
              isExpanded ? "w-[calc(100%-30px)]" : "w-[40px]",
            )}
          />

          {/* Icon - always in same position from sidebar edge */}
          <div className="absolute top-0 left-[15px] w-[40px] h-[40px] flex items-center justify-center dark:text-[#666666] text-black group-hover:!text-primary pointer-events-none">
            <div className={cn(isActive && "dark:!text-white")}>
              <Icon name={item.icon} className={cn("h-4 w-4")} />
            </div>
          </div>

          {isExpanded && (
            <div className="absolute top-0 left-[55px] right-[4px] h-[40px] flex items-center pointer-events-none">
              <span
                className={cn(
                  "text-sm font-medium transition-opacity duration-200 ease-in-out text-[#666] group-hover:text-primary",
                  "whitespace-nowrap overflow-hidden",
                  hasChildren ? "pr-2" : "",
                  isActive && "text-primary",
                )}
              >
                {item.name}
              </span>
              {hasChildren && (
                <button
                  type="button"
                  onClick={handleChevronClick}
                  className={cn(
                    "w-8 h-8 flex items-center justify-center transition-all duration-200 ml-auto mr-3",
                    "text-[#888] hover:text-primary pointer-events-auto",
                    isActive && "text-primary/60",
                    shouldShowChildren && "rotate-180",
                  )}
                >
                  <Icons.ChevronDown size={16} />
                </button>
              )}
            </div>
          )}
        </div>
      </Link>

      {/* Children */}
      {hasChildren && (
        <div
          className={cn(
            "transition-all duration-300 ease-in-out overflow-hidden",
            shouldShowChildren ? "max-h-96 mt-1" : "max-h-0",
          )}
        >
          {item.subLinks!.map((child, index) => {
            const isChildActive = pathName === child.href;
            return (
              <ChildItem
                key={index}
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
