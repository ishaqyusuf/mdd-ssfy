"use client";

import { cn } from "@/lib/utils";
import { createContextFactory } from "@/utils/context-factory";
import { cva, VariantProps } from "class-variance-authority";

import { Sheet, SheetContent, SheetContentProps } from "@gnd/ui/sheet";

import Portal from "../_v1/portal";
import { ScrollArea } from "../ui/scroll-area";

const sheetContentVariant = cva(
    "flex flex-col h-screen w-full overflow-x-hidden ",
    {
        variants: {
            floating: {
                true: "md:h-[96vh] md:mx-4 md:mt-[2vh]",
            },
            rounded: {
                true: "md:rounded-xl",
            },
            size: {
                xl: "sm:max-w-xl",
                "2xl": "lg:max-w-2xl",
                default: "",
                lg: "sm:max-w-lg",
            },
        },
    },
);
interface Props
    extends SheetContentProps,
        VariantProps<typeof sheetContentVariant> {
    children?;
    open?: boolean;
    onOpenChange?;
    sheetName: string;
}
const { Provider: SheetProvider, useContext: useSheet } = createContextFactory(
    function (sheetName) {
        return {
            nodeId: ["custom-sheet-content", sheetName]
                ?.filter(Boolean)
                .join("-"),
        };
    },
);
export function CustomSheet(props: Props) {
    return (
        <SheetProvider args={[props.sheetName]}>
            <CustomSheetBase {...props} />
        </SheetProvider>
    );
}
export function CustomSheetBase({
    children,
    open,
    onOpenChange,
    ...props
}: Props) {
    const sheet = useSheet();
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                id={sheet.nodeId}
                {...props}
                className={cn(
                    "p-2 px-4",
                    sheetContentVariant({
                        ...(props as any),
                    }),
                )}
            >
                {children}
            </SheetContent>
        </Sheet>
    );
}
export function CustomSheetContentPortal({ children, sheetId = null }) {
    // [`customSheetContent`,sheetId]
    const sheet = useSheet();
    return (
        <Portal nodeId={sheet.nodeId} noDelay>
            {children}
        </Portal>
    );
}
export function CustomSheetContent({ children = null, className = "" }) {
    return (
        <ScrollArea className={cn("-mx-4 flex-1 px-4", className)}>
            {children}
        </ScrollArea>
    );
}
