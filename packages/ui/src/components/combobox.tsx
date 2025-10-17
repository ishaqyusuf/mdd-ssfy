import * as React from "react";
import * as ComboboxPrimitive from "@diceui/combobox";
import { Check, ChevronDown, X } from "lucide-react";

import { cn } from "../utils";

const Combobox = ComboboxPrimitive.Root;

const ComboboxLabel = React.forwardRef<
  React.ElementRef<typeof ComboboxPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof ComboboxPrimitive.Label>
>(({ className, ...props }, ref) => (
  <ComboboxPrimitive.Label
    ref={ref}
    className={cn("px-0.5 py-1.5 text-sm font-semibold", className)}
    {...props}
  />
));
ComboboxLabel.displayName = ComboboxPrimitive.Label.displayName;

const ComboboxAnchor = React.forwardRef<
  React.ElementRef<typeof ComboboxPrimitive.Anchor>,
  React.ComponentPropsWithoutRef<typeof ComboboxPrimitive.Anchor>
>(({ className, ...props }, ref) => (
  <ComboboxPrimitive.Anchor
    ref={ref}
    className={cn(
      "shadow-xs data-focused:ring-1 data-focused:ring-zinc-800 dark:data-focused:ring-zinc-300 flex h-9 w-full items-center justify-between rounded-md border border-zinc-200 bg-white px-3 py-2 transition-colors dark:border-zinc-800 dark:bg-zinc-950",
      className,
    )}
    {...props}
  />
));
ComboboxAnchor.displayName = ComboboxPrimitive.Anchor.displayName;

const ComboboxInput = React.forwardRef<
  React.ElementRef<typeof ComboboxPrimitive.Input>,
  React.ComponentPropsWithoutRef<typeof ComboboxPrimitive.Input>
>(({ className, ...props }, ref) => (
  <ComboboxPrimitive.Input
    ref={ref}
    className={cn(
      "focus:outline-hidden flex h-9 w-full rounded-md bg-transparent text-base text-zinc-900 outline-none placeholder:text-zinc-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-50 dark:placeholder:text-zinc-400 md:text-sm",
      className,
    )}
    {...props}
  />
));
ComboboxInput.displayName = ComboboxPrimitive.Input.displayName;

const ComboboxTrigger = React.forwardRef<
  React.ElementRef<typeof ComboboxPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof ComboboxPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <ComboboxPrimitive.Trigger
    ref={ref}
    className={cn(
      "focus-visible:outline-hidden flex shrink-0 items-center justify-center rounded-r-md border-zinc-200 bg-transparent text-zinc-500 transition-colors hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-50",
      className,
    )}
    {...props}
  >
    {children || <ChevronDown className="h-4 w-4" />}
  </ComboboxPrimitive.Trigger>
));
ComboboxTrigger.displayName = ComboboxPrimitive.Trigger.displayName;

const ComboboxCancel = React.forwardRef<
  React.ElementRef<typeof ComboboxPrimitive.Cancel>,
  React.ComponentPropsWithoutRef<typeof ComboboxPrimitive.Cancel>
>(({ className, ...props }, ref) => (
  <ComboboxPrimitive.Cancel
    ref={ref}
    className={cn(
      "focus:outline-hidden absolute right-1 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-sm bg-background opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none",
      className,
    )}
    {...props}
  />
));
ComboboxCancel.displayName = ComboboxPrimitive.Cancel.displayName;

const ComboboxBadgeList = React.forwardRef<
  React.ElementRef<typeof ComboboxPrimitive.BadgeList>,
  React.ComponentPropsWithoutRef<typeof ComboboxPrimitive.BadgeList>
>(({ className, ...props }, ref) => (
  <ComboboxPrimitive.BadgeList
    ref={ref}
    className={cn("flex flex-wrap items-center gap-1.5", className)}
    {...props}
  />
));
ComboboxBadgeList.displayName = ComboboxPrimitive.BadgeList.displayName;
interface ComboboxBadgeItemProps
  extends React.ComponentPropsWithoutRef<typeof ComboboxPrimitive.BadgeItem> {
  disableDelete?: boolean;
  noDelete?: boolean;
  onDelete?: (e) => void;
}
const ComboboxBadgeItem = React.forwardRef<
  React.ElementRef<typeof ComboboxPrimitive.BadgeItem>,
  ComboboxBadgeItemProps
>(
  (
    { className, children, onDelete, disableDelete, noDelete, ...props },
    ref,
  ) => (
    <ComboboxPrimitive.BadgeItem
      ref={ref}
      className={cn(
        "inline-flex items-center justify-between gap-1 rounded-sm bg-secondary px-2 py-0.5",
        className,
      )}
      {...props}
    >
      <span className="truncate text-[13px] text-secondary-foreground">
        {children}
      </span>
      <ComboboxPrimitive.BadgeItemDelete
        onClick={onDelete}
        disabled={disableDelete}
        className={cn(
          "focus-visible:outline-hidden data-highlighted:bg-destructive shrink-0 rounded p-0.5 opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring",
          noDelete && "hidden",
        )}
      >
        <X className="h-3 w-3" />
      </ComboboxPrimitive.BadgeItemDelete>
    </ComboboxPrimitive.BadgeItem>
  ),
);
ComboboxBadgeItem.displayName = ComboboxPrimitive.BadgeItem.displayName;

const ComboboxContent = React.forwardRef<
  React.ElementRef<typeof ComboboxPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof ComboboxPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <ComboboxPrimitive.Portal>
    <ComboboxPrimitive.Content
      ref={ref}
      sideOffset={6}
      className={cn(
        "relative z-50 min-w-[var(--dice-anchor-width)] overflow-hidden rounded-md border border-zinc-200 bg-white p-1 text-zinc-950 shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50",
        className,
      )}
      {...props}
    >
      {children}
    </ComboboxPrimitive.Content>
  </ComboboxPrimitive.Portal>
));
ComboboxContent.displayName = ComboboxPrimitive.Content.displayName;

const ComboboxProgress = React.forwardRef<
  React.ElementRef<typeof ComboboxPrimitive.Progress>,
  React.ComponentPropsWithoutRef<typeof ComboboxPrimitive.Progress>
>(({ className, ...props }, ref) => (
  <ComboboxPrimitive.Progress
    ref={ref}
    className={cn("py-6 text-center text-sm", className)}
    {...props}
  >
    Loading...
  </ComboboxPrimitive.Progress>
));
ComboboxProgress.displayName = "";
const ComboboxEmpty = React.forwardRef<
  React.ElementRef<typeof ComboboxPrimitive.Empty>,
  React.ComponentPropsWithoutRef<typeof ComboboxPrimitive.Empty>
>(({ className, ...props }, ref) => (
  <ComboboxPrimitive.Empty
    ref={ref}
    className={cn("py-6 text-center text-sm", className)}
    {...props}
  />
));
ComboboxEmpty.displayName = ComboboxPrimitive.Empty.displayName;

const ComboboxGroup = React.forwardRef<
  React.ElementRef<typeof ComboboxPrimitive.Group>,
  React.ComponentPropsWithoutRef<typeof ComboboxPrimitive.Group>
>(({ className, ...props }, ref) => (
  <ComboboxPrimitive.Group
    ref={ref}
    className={cn("overflow-hidden", className)}
    {...props}
  />
));
ComboboxGroup.displayName = ComboboxPrimitive.Group.displayName;

const ComboboxGroupLabel = React.forwardRef<
  React.ElementRef<typeof ComboboxPrimitive.GroupLabel>,
  React.ComponentPropsWithoutRef<typeof ComboboxPrimitive.GroupLabel>
>(({ className, ...props }, ref) => (
  <ComboboxPrimitive.GroupLabel
    ref={ref}
    className={cn(
      "px-2 py-1.5 text-xs font-semibold text-muted-foreground",
      className,
    )}
    {...props}
  />
));
ComboboxGroupLabel.displayName = ComboboxPrimitive.GroupLabel.displayName;

const ComboboxItem = React.forwardRef<
  React.ElementRef<typeof ComboboxPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof ComboboxPrimitive.Item> & {
    outset?: boolean;
  }
>(({ className, children, outset, ...props }, ref) => (
  <ComboboxPrimitive.Item
    ref={ref}
    className={cn(
      "outline-hidden data-disabled:pointer-events-none data-highlighted:bg-zinc-100 data-highlighted:text-zinc-900 data-disabled:opacity-50 dark:data-highlighted:bg-zinc-800 dark:data-highlighted:text-zinc-50 relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm ",
      outset ? "pl-2 pr-8" : "pl-8 pr-2",
      className,
    )}
    {...props}
  >
    <ComboboxPrimitive.ItemIndicator
      className={cn(
        "absolute flex h-3.5 w-3.5 items-center justify-center",
        outset ? "right-2" : "left-2",
      )}
    >
      <Check className="h-4 w-4" />
    </ComboboxPrimitive.ItemIndicator>
    <ComboboxPrimitive.ItemText>{children}</ComboboxPrimitive.ItemText>
  </ComboboxPrimitive.Item>
));
ComboboxItem.displayName = ComboboxPrimitive.Item.displayName;

const ComboboxSeparator = React.forwardRef<
  React.ElementRef<typeof ComboboxPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof ComboboxPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <ComboboxPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props}
  />
));
ComboboxSeparator.displayName = ComboboxPrimitive.Separator.displayName;

export {
  Combobox,
  ComboboxAnchor,
  ComboboxInput,
  ComboboxTrigger,
  ComboboxCancel,
  ComboboxBadgeList,
  ComboboxBadgeItem,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxGroupLabel,
  ComboboxItem,
  ComboboxLabel,
  ComboboxProgress,
  ComboboxSeparator,
};
