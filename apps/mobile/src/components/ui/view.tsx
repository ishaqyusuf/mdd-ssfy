import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { Platform, View as RNView } from "react-native";

type ViewVariantProps = VariantProps<typeof viewVariants>;

type ViewVariant = NonNullable<ViewVariantProps["variant"]>;

const ViewClassContext = React.createContext<string | undefined>(undefined);

function View({
  className,
  asChild = false,
  variant = "default",
  // color,
  ...props
}: React.ComponentProps<typeof RNView> &
  ViewVariantProps &
  React.RefAttributes<RNView> & {
    asChild?: boolean;
  }) {
  const viewClass = React.useContext(ViewClassContext);
  // const Component = RNView;
  return (
    <RNView
      className={cn(
        // "bg-background",
        // viewVariants({ variant }),
        viewClass,
        className
      )}
      {...props}
    />
  );
}

export { View, ViewClassContext };
