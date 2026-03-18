import { cn } from "@gnd/ui/cn";
import { useSiteNav } from "./use-site-nav";
import type { ComponentType } from "react";

interface SiteNavLogoProps {
  Icon?: ComponentType<any>;
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
        "absolute top-0 left-0 h-[70px] flex items-center bg-card shadow-[0_1px_0_0_hsl(var(--border))] transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] z-[999]",
        isExpanded
          ? "w-full px-4 justify-start"
          : "w-[69px] justify-center",
        className,
      )}
    >
      {Link ? (
        <Link href={href} className="inline-flex items-center">
          {content}
        </Link>
      ) : (
        <a href={href} className="inline-flex items-center">
          {content}
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
