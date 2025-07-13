"use client";

import { cn } from "@/lib/utils";
import { createContextFactory } from "@/utils/context-factory";
import { cva, VariantProps } from "class-variance-authority";

import { Sheet, SheetContent, SheetContentProps } from "@gnd/ui/sheet";

import Portal from "../_v1/portal";
import { ScrollArea } from "@gnd/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";

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
                "2xl": "sm:max-w-5xl md:max-w-2xl",
                "3xl": "sm:max-w-5xl md:max-w-3xl",
                "4xl": "sm:max-w-5xl md:max-w-4xl",
                "5xl": "sm:max-w-5xl md:max-w-6xl",
                default: "",
                lg: "sm:max-w-lg",
            },
        },
    },
);
interface Props
    extends SheetContentProps,
        VariantProps<typeof sheetContentVariant> {
    floating?: Boolean;
    children?;
    open?: Boolean;
    onOpenChange?;
    sheetName: string;
}
const { Provider: SheetProvider, useContext: useSheet } = createContextFactory(
    function (sheetName) {
        return {
            nodeId: ["csc", sheetName]?.filter(Boolean).join("-"),
            scrollContentId: ["cssc", sheetName]?.filter(Boolean).join("-"),
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
    sheetName,
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
export function CustomSheetContentPortal({ children }) {
    // [`customSheetContent`,sheetId]
    const sheet = useSheet();
    const mobile = useIsMobile();
    const nodeId = mobile ? sheet.scrollContentId : sheet.nodeId;

    return (
        <>
            <Portal nodeId={nodeId} noDelay>
                {children}
            </Portal>
        </>
    );
}
export function CustomSheetContent({ children = null, className = "" }) {
    const sheet = useSheet();
    return (
        <ScrollArea
            className={cn("-mx-4 flex-1  px-4", className, "flex flex-col")}
        >
            <div
                id={sheet.scrollContentId}
                className="flex flex-col gap-4 pb-36 sm:pb-16"
            >
                {children}
            </div>
        </ScrollArea>
    );
}
