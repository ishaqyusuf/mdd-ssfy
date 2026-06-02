"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { createPortal } from "react-dom";

import { cn } from "../utils";
import { Icons, type IconKeys } from "./icons";

interface HeaderTabRootProps extends React.ComponentProps<"nav"> {
  portal?: boolean;
  portalNodeId?: string;
}

interface HeaderTabTabProps extends Omit<
  React.ComponentProps<typeof Link>,
  "href" | "children"
> {
  href: string;
  label: React.ReactNode;
  icon?: IconKeys | (string & {});
  badge?: React.ReactNode;
  disabled?: boolean;
  exact?: boolean;
  active?: boolean;
}

type HeaderTabSpacerProps = React.ComponentProps<"div">;

function getIcon(icon?: HeaderTabTabProps["icon"]) {
  if (!icon) return undefined;

  return Icons[icon as IconKeys];
}

function getTabTone(icon?: HeaderTabTabProps["icon"]) {
  switch (icon) {
    case "orders":
      return {
        hover: "hover:border-sky-200 hover:bg-sky-50 hover:text-sky-800",
        active:
          "border-sky-200 bg-sky-50 text-sky-900 ring-sky-200/80 after:bg-sky-500",
        icon: "group-hover:border-sky-200 group-hover:bg-sky-100 group-hover:text-sky-700",
        activeIcon: "border-sky-500 bg-sky-600 text-white",
        badge: "border-sky-200 bg-sky-100 text-sky-800",
      };
    case "quotes":
      return {
        hover: "hover:border-amber-200 hover:bg-amber-50 hover:text-amber-900",
        active:
          "border-amber-200 bg-amber-50 text-amber-950 ring-amber-200/80 after:bg-amber-500",
        icon: "group-hover:border-amber-200 group-hover:bg-amber-100 group-hover:text-amber-700",
        activeIcon: "border-amber-500 bg-amber-500 text-white",
        badge: "border-amber-200 bg-amber-100 text-amber-900",
      };
    case "production":
      return {
        hover:
          "hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-900",
        active:
          "border-emerald-200 bg-emerald-50 text-emerald-950 ring-emerald-200/80 after:bg-emerald-500",
        icon: "group-hover:border-emerald-200 group-hover:bg-emerald-100 group-hover:text-emerald-700",
        activeIcon: "border-emerald-500 bg-emerald-600 text-white",
        badge: "border-emerald-200 bg-emerald-100 text-emerald-900",
      };
    case "customers":
      return {
        hover:
          "hover:border-violet-200 hover:bg-violet-50 hover:text-violet-900",
        active:
          "border-violet-200 bg-violet-50 text-violet-950 ring-violet-200/80 after:bg-violet-500",
        icon: "group-hover:border-violet-200 group-hover:bg-violet-100 group-hover:text-violet-700",
        activeIcon: "border-violet-500 bg-violet-600 text-white",
        badge: "border-violet-200 bg-violet-100 text-violet-900",
      };
    case "reports":
      return {
        hover:
          "hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-900",
        active:
          "border-indigo-200 bg-indigo-50 text-indigo-950 ring-indigo-200/80 after:bg-indigo-500",
        icon: "group-hover:border-indigo-200 group-hover:bg-indigo-100 group-hover:text-indigo-700",
        activeIcon: "border-indigo-500 bg-indigo-600 text-white",
        badge: "border-indigo-200 bg-indigo-100 text-indigo-900",
      };
    default:
      return {
        hover: "hover:border-blue-200 hover:bg-blue-50 hover:text-blue-900",
        active:
          "border-blue-200 bg-blue-50 text-blue-950 ring-blue-200/80 after:bg-blue-500",
        icon: "group-hover:border-blue-200 group-hover:bg-blue-100 group-hover:text-blue-700",
        activeIcon: "border-blue-500 bg-blue-600 text-white",
        badge: "border-blue-200 bg-blue-100 text-blue-900",
      };
  }
}

function usePortalNode(portalNodeId: string, enabled: boolean) {
  const [portalNode, setPortalNode] = React.useState<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!enabled) return;

    setPortalNode(document.getElementById(portalNodeId));
  }, [enabled, portalNodeId]);

  return portalNode;
}

function HeaderTabRoot({
  children,
  portal = true,
  portalNodeId = "pageTab",
  className,
  "aria-label": ariaLabel = "Page sections",
  ...props
}: HeaderTabRootProps) {
  const portalNode = usePortalNode(portalNodeId, portal);

  const content = (
    <nav
      aria-label={ariaLabel}
      className={cn(
        "flex min-h-12 h-12 w-full items-center gap-1.5 overflow-x-auto border-b bg-muted/30 px-4 py-1.5 shadow-[inset_0_1px_0_hsl(var(--background))] [scrollbar-width:none] sm:px-6 [&::-webkit-scrollbar]:hidden",
        className,
      )}
      {...props}
    >
      {children}
    </nav>
  );

  if (!portal) return content;
  if (!portalNode) return null;

  return createPortal(content, portalNode);
}

function HeaderTabItem({
  href,
  label,
  icon,
  badge,
  disabled = false,
  exact = false,
  active,
  className,
  ...props
}: HeaderTabTabProps) {
  const pathname = usePathname();
  const isRouteActive = exact
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
  const isActive = active ?? isRouteActive;
  const Icon = getIcon(icon);
  const tone = getTabTone(icon);

  const tabClassName = cn(
    "group relative inline-flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-md border border-transparent px-2.5 text-sm font-medium text-muted-foreground transition-[background-color,border-color,color,box-shadow] hover:shadow-sm hover:shadow-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2",
    tone.hover,
    isActive &&
      cn(
        "shadow-sm shadow-black/10 ring-1 after:absolute after:inset-x-2 after:-bottom-[7px] after:h-0.5 after:rounded-full",
        tone.active,
      ),
    disabled && "pointer-events-none opacity-50",
    className,
  );

  const content = (
    <>
      {Icon ? (
        <span
          className={cn(
            "grid size-6 place-items-center rounded-md border border-border/70 bg-muted text-muted-foreground transition-[background-color,border-color,color]",
            tone.icon,
            isActive && tone.activeIcon,
          )}
        >
          <Icon className="size-3.5" aria-hidden="true" />
        </span>
      ) : null}
      <span className="leading-none">{label}</span>
      {badge ? (
        <span
          className={cn(
            "ml-0.5 inline-flex min-w-5 items-center justify-center rounded-md border border-border/70 bg-background px-1.5 text-[11px] font-semibold leading-5 text-muted-foreground",
            isActive && tone.badge,
          )}
        >
          {badge}
        </span>
      ) : null}
    </>
  );

  if (disabled) {
    return (
      <span aria-disabled="true" className={tabClassName}>
        {content}
      </span>
    );
  }

  return (
    <Link
      aria-current={isActive ? "page" : undefined}
      className={tabClassName}
      href={href}
      {...props}
    >
      {content}
    </Link>
  );
}

function HeaderTabSpacer({ className, ...props }: HeaderTabSpacerProps) {
  return <div className={cn("flex-1", className)} {...props} />;
}

export const HeaderTab = Object.assign(HeaderTabRoot, {
  Tab: HeaderTabItem,
  Spacer: HeaderTabSpacer,
});
