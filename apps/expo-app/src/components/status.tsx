import { cva, VariantProps } from "class-variance-authority";
import { View } from "./ui/view";
import { cn } from "@/lib/utils";
import { Text } from "react-native";
import { getStatusVariant } from "@/lib/status-variant";

/* =========================
   STATUS CONTAINER
========================= */
export const statusVariant = cva(
  "inline-flex items-center rounded-full px-2 py-1",
  {
    variants: {
      style: {
        default: "",
        light: "",
        outline: "bg-transparent border",
      },

      variant: {
        primary: "bg-primary",
        success: "bg-success",
        warn: "bg-warn",
        secondary: "bg-secondary",
        muted: "bg-muted",
        accent: "bg-accent",
        destructive: "bg-destructive",
      },
    },

    compoundVariants: [
      /* LIGHT */
      {
        style: "light",
        variant: "primary",
        className: "bg-primary/15",
      },
      {
        style: "light",
        variant: "success",
        className: "bg-success/15",
      },
      {
        style: "light",
        variant: "warn",
        className: "bg-warn/15",
      },
      {
        style: "light",
        variant: "secondary",
        className: "bg-secondary/20",
      },
      {
        style: "light",
        variant: "muted",
        className: "bg-muted/30",
      },
      {
        style: "light",
        variant: "accent",
        className: "bg-accent/20",
      },
      {
        style: "light",
        variant: "destructive",
        className: "bg-destructive/15",
      },

      /* OUTLINE */
      {
        style: "outline",
        variant: "primary",
        className: "border-primary",
      },
      {
        style: "outline",
        variant: "success",
        className: "border-success",
      },
      {
        style: "outline",
        variant: "warn",
        className: "border-warn",
      },
      {
        style: "outline",
        variant: "secondary",
        className: "border-secondary",
      },
      {
        style: "outline",
        variant: "muted",
        className: "border-muted",
      },
      {
        style: "outline",
        variant: "accent",
        className: "border-accent",
      },
      {
        style: "outline",
        variant: "destructive",
        className: "border-destructive",
      },
    ],

    defaultVariants: {
      style: "default",
      variant: "primary",
    },
  }
);

/* =========================
   STATUS TEXT (AUTO COLOR) 
========================= */
export const statusTextVariant = cva("text-xs font-semibold", {
  variants: {
    style: {
      default: "",
      light: "",
      outline: "",
    },

    variant: {
      primary: "text-primary-foreground",
      success: "text-success-foreground",
      warn: "text-warn-foreground",
      secondary: "text-secondary-foreground",
      muted: "text-muted-foreground",
      accent: "text-accent-foreground",
      destructive: "text-destructive-foreground",
    },
  },

  compoundVariants: [
    /* LIGHT + OUTLINE → base color text */
    {
      style: "light",
      variant: "primary",
      className: "text-primary",
    },
    {
      style: "light",
      variant: "success",
      className: "text-success",
    },
    {
      style: "light",
      variant: "warn",
      className: "text-warn",
    },
    {
      style: "light",
      variant: "destructive",
      className: "text-destructive",
    },

    {
      style: "outline",
      variant: "primary",
      className: "text-primary",
    },
    {
      style: "outline",
      variant: "success",
      className: "text-success",
    },
    {
      style: "outline",
      variant: "warn",
      className: "text-warn",
    },
    {
      style: "outline",
      variant: "destructive",
      className: "text-destructive",
    },
  ],

  defaultVariants: {
    style: "default",
    variant: "primary",
  },
});

type StatusVariants = VariantProps<typeof statusVariant>;
export type StatusVariantProps = StatusVariants["variant"];

interface Props {
  children?;
  value?;
  light?: boolean;
  style?: StatusVariants["style"];
}
export function Status(props: Props) {
  const variant = getStatusVariant(props.value);
  return (
    <View
      className={cn(
        "",
        statusVariant({
          variant,
          style: props.style,
        })
      )}
    >
      <Text
        className={cn(
          statusTextVariant({
            variant,
            style: props.style,
          })
        )}
      >
        {props.value}
      </Text>
    </View>
  );
}
