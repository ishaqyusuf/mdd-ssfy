import { cn } from "@gnd/ui/cn";
import { Icons } from "@gnd/ui/icons";
import { Icon } from "@gnd/ui/icons";
import { useRef, useState } from "react";
import type { NavLink as NavLinkType, NavModule } from "../lib/types";
import { isPathInLink, normalizeNavPath } from "../lib/utils";
import { NavLink } from "./nav-link";
import { NavChildItem } from "./nav-child-item";
import { useSiteNav } from "./use-site-nav";

const HOVER_EXPAND_DELAY_MS = 1200;

export interface NavItemProps {
  module: NavModule;
  item: NavLinkType;
  isActive: boolean;
  isExpanded: boolean;
  isItemExpanded: boolean;
  onToggle: (path: string) => void;
  onSelect?: () => void;
}

export const NavItem = ({
  item,
  isActive,
  isExpanded,
  onSelect,
  onToggle,
}: NavItemProps) => {
  const {
    props: { pathName },
  } = useSiteNav();
  const normalizedPathName = normalizeNavPath(
    pathName?.toLocaleLowerCase() || "",
  );
  const hasChildren = item.subLinks && item.subLinks.length > 0;
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasActiveChild = hasChildren
    ? item.subLinks!.some((child) => isPathInLink(normalizedPathName, child))
    : false;
  const shouldShowChildren =
    isExpanded && (isHovered || hasActiveChild || isActive);

  const handleMouseEnter = () => {
    if (hasChildren && !hasActiveChild && !isActive) {
      hoverTimeoutRef.current = setTimeout(() => {
        setIsHovered(true);
      }, HOVER_EXPAND_DELAY_MS);
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
      <NavLink
        prefetch
        href={item.href || ""}
        onClick={() => onSelect?.()}
        className="group"
      >
        <div className="relative">
          <div
            className={cn(
              "rounded-md h-[36px] transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] ml-[10px] mr-[10px]",
              isActive
                ? "bg-primary/[0.07] dark:bg-primary/[0.12]"
                : "group-hover:bg-muted/60",
              isExpanded ? "w-[calc(100%-20px)]" : "w-[40px]",
            )}
          />

          {isActive && (
            <div className="absolute top-[8px] bottom-[8px] left-[10px] w-[3px] rounded-full bg-primary" />
          )}

          <div className="absolute top-0 left-[10px] w-[40px] h-[36px] flex items-center justify-center text-muted-foreground group-hover:!text-primary pointer-events-none">
            <div className={cn(isActive && "!text-primary")}>
              <Icon name={item.icon} className={cn("h-4 w-4")} />
            </div>
          </div>

          {isExpanded && (
            <div className="absolute top-0 left-[50px] right-[4px] h-[36px] flex items-center pointer-events-none">
              <span
                className={cn(
                  "text-sm font-medium transition-colors duration-150 text-muted-foreground group-hover:text-foreground",
                  "whitespace-nowrap overflow-hidden",
                  hasChildren ? "pr-2" : "",
                  isActive && "text-foreground font-semibold",
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
      </NavLink>

      {hasChildren && (
        <div
          className={cn(
            "transition-all duration-300 ease-in-out overflow-hidden",
            shouldShowChildren ? "max-h-96 mt-1" : "max-h-0",
          )}
        >
          {item.subLinks!.map((child, index) => {
            const isChildActive = isPathInLink(normalizedPathName, child);
            return (
              <NavChildItem
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
