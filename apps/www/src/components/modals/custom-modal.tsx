"use client";

import { cn } from "@/lib/utils";
import { cva, VariantProps } from "class-variance-authority";

import { SheetContentProps } from "@gnd/ui/sheet";

import Portal from "../_v1/portal";
import { ScrollArea } from "@gnd/ui/scroll-area";

import { ComponentPropsWithoutRef } from "react";
import { Dialog } from "@gnd/ui/composite";

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
            "5xl": "sm:max-w-5xl",
            "4xl": "sm:max-w-4xl",
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
    extends SheetContentProps, VariantProps<typeof sheetContentVariant> {
    children?;
    open?: boolean;
    onOpenChange?;
    title?;
    description?;
    className?: string;
    titleAsChild?: boolean;
    descriptionAsChild?: boolean;
}
function CustomModalBase({
    children,
    open,
    title,
    onOpenChange,
    description,
    className,
    titleAsChild = false,
    descriptionAsChild = false,
    ...props
}: Props) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <Dialog.Content
                id="customModalContent"
                {...props}
                className={cn(
                    "px-4",
                    sheetContentVariant({
                        ...(props as any),
                    }),
                    className,
                )}
            >
                <Dialog.Header>
                    <Dialog.Title asChild={titleAsChild} id="customModalTitle">
                        {title}
                    </Dialog.Title>
                    {!description || (
                        <Dialog.Description
                            id="customModalDescription"
                            asChild={descriptionAsChild}
                        >
                            {description}
                        </Dialog.Description>
                    )}
                </Dialog.Header>
                {children}
            </Dialog.Content>
        </Dialog>
    );
}
function Title({ children }) {
    return (
        <Portal nodeId={"customModalTitle"} noDelay>
            {children}
        </Portal>
    );
}
function Description({ children }) {
    return (
        <Portal nodeId={"customModalDescription"} noDelay>
            {children}
        </Portal>
    );
}
export function CustomModalPortal({ children }) {
    return (
        <Portal nodeId={"customModalContent"} noDelay>
            {children}
        </Portal>
    );
}
interface CustomModalContentProps extends ComponentPropsWithoutRef<
    typeof ScrollArea
> {
    // className?: string;
}
export function CustomModalContent({
    children,
    className,
    ...props
}: CustomModalContentProps) {
    return (
        <ScrollArea
            className={cn(
                "-mx-4 flex-1 px-4 max-h-[70vh] overflow-auto",
                className,
            )}
            {...(props as any)}
        >
            {children}
        </ScrollArea>
    );
}
function Footer({ children, className = "" }) {
    return (
        <CustomModalPortal>
            <Dialog.Footer className={cn(className)}>{children}</Dialog.Footer>
        </CustomModalPortal>
    );
}
export const CustomModal = Object.assign(CustomModalBase, {
    Content: CustomModalContent,
    Portal: CustomModalPortal,
    Footer,
    Title,
    Description,
});
