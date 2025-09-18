"use client";

import { cn } from "@/lib/utils";
import createContextFactory from "@/utils/context-factory";
import { cva, VariantProps } from "class-variance-authority";

import {
    Sheet,
    SheetContent,
    SheetContentProps,
    SheetHeader as ShadSheetHeader,
    SheetTitle,
    SheetDescription,
} from "@gnd/ui/sheet";

import Portal from "../_v1/portal";
import { ScrollArea } from "@gnd/ui/scroll-area";
import { useMediaQuery } from "react-responsive";
import { screens } from "@/lib/responsive";

const sheetContentVariant = cva(
    "p-2 px-4 flex flex-col h-screens w-full overflow-x-hidden ",
    {
        variants: {
            floating: {
                // true: "md:h-[96vh] md:mx-4 md:mt-[2vh]",
                true: "",
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
    // floating?: boolean;
    children?;
    open?: boolean;
    onOpenChange?;
    sheetName: string;
    title?: string;
    description?: string;
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
    floating,
    rounded,
    ...props
}: Props) {
    const sheet = useSheet();

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                id={sheet.nodeId}
                {...props}
                className={cn(
                    sheetContentVariant({
                        ...(props as any),
                        floating,
                        rounded,
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

    const isDesktop = useMediaQuery(screens.lg);
    const nodeId = !isDesktop ? sheet.scrollContentId : sheet.nodeId;

    return (
        <>
            <Portal nodeId={sheet.nodeId} noDelay>
                {children}
            </Portal>
        </>
    );
}
export function CustomSheetContent({ children = null, className = "" }) {
    const sheet = useSheet();
    return (
        <ScrollArea
            className={cn(
                "-mx-4 flex-1 sh-[90vh] px-4",
                className,
                "flex flex-col",
            )}
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

function BaseSheetHeader({ children = null }) {
    return <ShadSheetHeader className="">{children}</ShadSheetHeader>;
}
function Title({ children }) {
    return <SheetTitle>{children}</SheetTitle>;
}
function Description({ children }) {
    return <SheetDescription>{children}</SheetDescription>;
}
export const SheetHeader = Object.assign(BaseSheetHeader, {
    Title,
    Description,
});
