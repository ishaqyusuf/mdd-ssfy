"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import * as React from "react";
import { cn } from "../utils";

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex min-h-11 items-center justify-center gap-1 rounded-2xl border border-border/60 bg-muted/60 p-1 text-muted-foreground shadow-sm shadow-black/5 backdrop-blur supports-[backdrop-filter]:bg-background/70 max-lg:gap-2 max-lg:rounded-none max-lg:border-none max-lg:bg-transparent max-lg:p-0 max-lg:shadow-none max-lg:backdrop-blur-0",
      className,
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex min-h-9 items-center justify-center whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-medium text-foreground/80 ring-offset-background transition-[color,background-color,box-shadow,transform] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 max-lg:min-h-10 max-lg:bg-background max-lg:px-4 max-lg:shadow-sm max-lg:shadow-black/5 max-lg:data-[state=inactive]:border max-lg:data-[state=inactive]:border-border/70 data-[state=active]:-translate-y-px data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm data-[state=active]:shadow-primary/20 data-[state=active]:ring-1 data-[state=active]:ring-primary/20 max-lg:data-[state=active]:border max-lg:data-[state=active]:border-primary/30 max-lg:data-[state=active]:shadow-md max-lg:data-[state=active]:shadow-primary/20 data-[state=inactive]:hover:bg-accent data-[state=inactive]:hover:text-accent-foreground max-lg:data-[state=inactive]:hover:border-accent-foreground/10",
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-3 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2",
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
