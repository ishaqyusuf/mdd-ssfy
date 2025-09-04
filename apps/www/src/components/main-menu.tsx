"use client";

import { Fragment, useRef, useState } from "react";
import { getLinkModules, LinkItem } from "./sidebar/links";
import { cn } from "@gnd/ui/cn";
import { cva } from "class-variance-authority";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Icon } from "./_v1/icons";

import { Icons } from "@gnd/ui/icons";
import { useSidebar } from "@/hooks/use-sidebar";
type Props = {
    onSelect?: () => void;
    isExpanded?: boolean;
};
const moduleVariants = cva("", {
    variants: {
        renderMode: {
            suppressed: "",
            default: "",
            none: "",
        },
        isCurrent: {
            true: "",
            false: "",
        },
        moduleType: {
            global: "",
            module: "",
        },
    },
    compoundVariants: [
        {
            // renderMode: "default",
            isCurrent: false,
            className: "hidden",
            moduleType: "module",
        },
    ],
    defaultVariants: {},
});
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

export function MainMenu() {
    const { linkModules, onSelect, activeLink, isExpanded } = useSidebar();
    const [expandedItem, setExpandedItem] = useState<string | null>(null);
    return (
        <div className="mt-6 w-full">
            <nav className="w-full overflow-auto">
                <div className="flex flex-col gap-2">
                    {/* <span>{JSON.stringify({ activeLink })}</span> */}
                    {linkModules?.modules
                        ?.filter((a) => a.activeLinkCount)
                        .map((module, mi) => (
                            <Fragment key={mi}>
                                {module?.sections?.map((section, si) => (
                                    <div
                                        key={si}
                                        className={cn(
                                            !section?.linksCount && "hidden",
                                            moduleVariants({
                                                isCurrent:
                                                    activeLink?.module ==
                                                    module?.name,
                                                // renderMode,
                                                moduleType: module?.name
                                                    ? "module"
                                                    : "global",
                                            }),
                                        )}
                                    >
                                        {!isExpanded && si > 0 ? null : (
                                            <div
                                                className={cn(
                                                    "uppercase hidden text-xs mx-4 mt-4 font-semibold text-muted-foreground",
                                                    activeLink?.module !=
                                                        module.name &&
                                                        sectionLabel({
                                                            renderMode:
                                                                isExpanded
                                                                    ? "default"
                                                                    : "suppressed",
                                                        }),
                                                    !section?.title &&
                                                        !section?.name &&
                                                        (si > 0 ||
                                                            !module?.name) &&
                                                        "hidden",
                                                    isExpanded &&
                                                        si > 0 &&
                                                        "block",
                                                )}
                                            >
                                                {si == 0 && !isExpanded
                                                    ? module.name
                                                    : section?.title ||
                                                      section.name}
                                            </div>
                                        )}
                                        <div>
                                            {section?.links
                                                ?.filter((l) => l?.show)
                                                ?.map((link, li) => (
                                                    <Fragment key={li}>
                                                        {/* {link?.subLinks?.length ? } */}
                                                        <Item
                                                            isExpanded={
                                                                isExpanded
                                                            }
                                                            isItemExpanded={
                                                                expandedItem ===
                                                                link.href
                                                            }
                                                            onToggle={(
                                                                path,
                                                            ) => {
                                                                setExpandedItem(
                                                                    expandedItem ===
                                                                        path
                                                                        ? null
                                                                        : path,
                                                                );
                                                            }}
                                                            item={link}
                                                            key={li}
                                                            module={module}
                                                            isActive={
                                                                activeLink.module ==
                                                                    module.name &&
                                                                activeLink.name ===
                                                                    link.name
                                                            }
                                                            onSelect={onSelect}
                                                        />
                                                    </Fragment>
                                                ))}
                                        </div>
                                    </div>
                                ))}
                            </Fragment>
                        ))}
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
    module: ReturnType<typeof getLinkModules>["modules"][number];
    item: ReturnType<
        typeof getLinkModules
    >["modules"][number]["sections"][number]["links"][number] & {
        // children?;
    };

    isActive: boolean;
    isExpanded: boolean;
    isItemExpanded: boolean;
    onToggle: (path: string) => void;
    onSelect?: () => void;
}

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
                        !shouldSkipAnimation &&
                            "transition-all duration-300 ease-in-out",
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
    const pathname = usePathname();
    const hasChildren = item.subLinks && item.subLinks.length > 0;
    const [isHovered, setIsHovered] = useState(false);
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Check if any child is currently active
    const hasActiveChild = hasChildren
        ? item.subLinks!.some((child) => pathname === child.href)
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
                        const isChildActive = pathname === child.href;
                        return (
                            <ChildItem
                                key={child.href}
                                child={child}
                                isActive={isChildActive}
                                isExpanded={isExpanded}
                                isParentHovered={
                                    isHovered || hasActiveChild || isActive
                                }
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

