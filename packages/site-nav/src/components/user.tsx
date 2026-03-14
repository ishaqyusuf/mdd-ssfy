import { Avatar, AvatarFallback, AvatarImage } from "@gnd/ui/avatar";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";
import { useSiteNav } from "./use-site-nav";
import type { ReactNode } from "react";

type SiteNavUserData = {
  name?: string;
  email?: string;
  avatar?: string;
};

interface SiteNavUserProps {
  user: SiteNavUserData;
  onLogout?: () => void;
  children?: ReactNode;
}

function getInitials(name?: string) {
  if (!name) return "";
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() || "").join("");
}

export function User({ user, onLogout, children }: SiteNavUserProps) {
  const { isExpanded } = useSiteNav();

  return (
    <div className="relative h-[40px] w-full overflow-hidden rounded-md border border-border bg-background">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="lg"
            variant="link"
            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground flex h-full w-full gap-2 px-2"
          >
            <Avatar className="h-8 w-8 rounded-lg">
              <AvatarImage src={user?.avatar} alt={user?.name} />
              <AvatarFallback className="rounded-lg">
                {getInitials(user?.name)}
              </AvatarFallback>
            </Avatar>
            {!isExpanded || (
              <>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{user?.name}</span>
                  <span className="truncate text-xs">{user?.email}</span>
                </div>
                <Icons.ChevronDown className="ml-auto size-4" />
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
          side="right"
          align="end"
          sideOffset={4}
        >
          <DropdownMenuLabel className="p-0 font-normal">
            <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user?.avatar} alt={user?.name} />
                <AvatarFallback className="rounded-lg">
                  {getInitials(user?.name)}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{user?.name}</span>
                <span className="truncate text-xs">{user?.email}</span>
              </div>
            </div>
          </DropdownMenuLabel>
          {children ? <DropdownMenuSeparator /> : null}
          {children}
          {onLogout ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onLogout}>
                <Icons.ExitToApp className="size-4 mr-2" />
                Log out
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
