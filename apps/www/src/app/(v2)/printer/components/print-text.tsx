"use client";

import { cn } from "@/lib/utils";
import { VariantProps, cva } from "class-variance-authority";

const textVariants = cva("", {
    variants: {
        colSpan: {
            "1": "",
            "2": "",
            "8": "",
        },
        font: {
            default: "",
            bold: "font-bold",
        },
        color: {
            default: "text-primary",
            red: "text-red-700",
        },
        bg: {
            default: "",
            black: "bg-black text-white",
            shade: "bg-slate-200",
        },
        size: {
            default: "",
            xl: "text-xl",
            lg: "text-lg",
            base: "text-base",
        },
        text: {
            default: "",
            uppercase: "uppercase",
        },
        position: {
            default: "",
            center: "text-center",
            right: "text-right",
            left: "text-left",
        },
    },
    defaultVariants: {
        font: "default",
        color: "default",
        bg: "default",
    },
});
export type PrintTextProps = VariantProps<typeof textVariants>;
interface Props extends PrintTextProps {
    children?;
    value?;
    className?: string;
}
export default function Text({ children, className, value, ...props }: Props) {
    return (
        <div className={cn(textVariants({ ...props }), className)}>
            {children && children}
            {value && value}
        </div>
    );
}
