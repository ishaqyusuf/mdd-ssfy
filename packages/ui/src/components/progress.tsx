"use client";

import * as ProgressPrimitive from "@radix-ui/react-progress";
import * as React from "react";
import { cn } from "../utils";
import { cva } from "class-variance-authority";

const containerStyle = cva("relative h-4 w-full overflow-hidden rounded-full", {
  variants: {
    variant: {
      veryLow: "bg-red-100",
      low: "bg-orange-100",
      medium: "bg-amber-100",
      high: "bg-lime-100",
      veryHigh: "bg-emerald-100",
    },
  },
  defaultVariants: {
    variant: "veryLow",
  },
});

const progressStyle = cva("h-full transition-all rounded-full", {
  variants: {
    variant: {
      veryLow: "bg-red-500",
      low: "bg-orange-400",
      medium: "bg-amber-400",
      high: "bg-lime-500",
      veryHigh: "bg-emerald-500",
    },
  },
  defaultVariants: {
    variant: "veryLow",
  },
});

const getVariant = (value: number | null | undefined):
  | "veryLow"
  | "low"
  | "medium"
  | "high"
  | "veryHigh" => {
  if (!value || value < 20) return "veryLow";
  if (value < 40) return "low";
  if (value < 60) return "medium";
  if (value < 80) return "high";
  return "veryHigh";
};

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      containerStyle({variant: getVariant(value)}),
      className
    )}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className={cn(progressStyle({variant: getVariant(value)}))}
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </ProgressPrimitive.Root>
));
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
