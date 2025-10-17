"use client";

import { cn } from "@/lib/utils";
import { cva, VariantProps } from "class-variance-authority";

import { Sheet, SheetContent, SheetContentProps } from "@gnd/ui/sheet";

import Portal from "../_v1/portal";
import { ScrollArea } from "@gnd/ui/scroll-area";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@gnd/ui/dialog";

const sheetContentVariant = cva("flex flex-col w-full ", {
    variants: {
        floating: {
            true: "md:h-[96vh] md:mx-4 md:mt-[2vh]",
        },
        rounded: {
            true: "md:rounded-xl",
        },
        height: {
            default: "",
            sm: "sm:h-[45vh]",
            md: "sm:h-[65vh]",
            lg: "sm:h-[85vh]",
        },
        size: {
            "3xl": "sm:max-w-3xl",
            "2xl": "sm:max-w-2xl",
            xl: "sm:max-w-xl",
            default: "",
            lg: "sm:max-w-lg",
            sm: "sm:max-w-sm",
            md: "sm:max-w-md",
        },
    },
    defaultVariants: {
        height: "default",
    },
});
interface Props
    extends SheetContentProps,
        VariantProps<typeof sheetContentVariant> {
    children?;
    open?: boolean;
    onOpenChange?;
    title?;
    description?;
}
export function CustomModal({
    children,
    open,
    title,
    onOpenChange,
    description,
    ...props
}: Props) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                id="customModalContent"
                {...props}
                className={cn(
                    "px-4",
                    sheetContentVariant({
                        ...(props as any),
                    }),
                )}
            >
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    {!description || (
                        <DialogDescription>{description}</DialogDescription>
                    )}
                </DialogHeader>
                {children}
            </DialogContent>
        </Dialog>
    );
}
export function CustomModalPortal({ children }) {
    return (
        <Portal nodeId={"customModalContent"} noDelay>
            {children}
        </Portal>
    );
}
export function CustomModalContent({ children = null, className = "" }) {
    return (
        <ScrollArea className={cn("-mx-4 flex-1 px-4", className)}>
            {children}
        </ScrollArea>
    );
}
