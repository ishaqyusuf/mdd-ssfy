"use client";
import { cva, VariantProps } from "class-variance-authority";
import { cn } from "../../utils";
import { ScrollArea } from "../scroll-area";
import {
  Sheet as BaseSheet,
  SheetContent,
  SheetContentProps,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "../sheet";
import { useMediaQuery } from "react-responsive";
import { Label } from "../label";
import { Button } from "../button";
import { Icons } from "./icons";
import { screens } from "@gnd/utils/responsive";
import Portal from "./portal";
import { createContext, useContext } from "react";

const sheetContentVariant = cva(
  "flex flex-col h-screen sh-[vh] transition-all duration-300 ease-in-out  w-full overflow-x-hidden ",
  {
    variants: {
      floating: {
        true: "md:h-[96vh]s md:mx-4 md:mt-[2vh]s",
        false: "",
      },
      rounded: {
        true: "md:rounded-xl",
        false: "",
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
    defaultVariants: {
      floating: false,
      rounded: false,
      size: "default",
    },
  }
);
interface Props
  extends SheetContentProps,
    VariantProps<typeof sheetContentVariant> {
  children?;
  open?: boolean;
  onOpenChange?;
  sheetName: string;
  secondaryOpened?: boolean;
  onCloseSecondary?;
  primarySize?: VariantProps<typeof sheetContentVariant>["size"];
  secondarySize?: VariantProps<typeof sheetContentVariant>["size"];
}

type CustomSheetContext = ReturnType<typeof createCustomSheetContext>;
export const CustomSheetContext = createContext<CustomSheetContext>(undefined);
export const SheetProvider = CustomSheetContext.Provider;
interface CustomSheetContextProps {
  sheetName: string;
  secondaryOpened?;
  onCloseSecondary?;
}

export const createCustomSheetContext = (props: CustomSheetContextProps) => {
  const { sheetName, secondaryOpened, onCloseSecondary } = props;
  const isDesktop = useMediaQuery(screens.lg);

  return {
    nodeId: ["csc", sheetName]?.filter(Boolean).join("-"),
    scrollContentId: ["cssc", sheetName]?.filter(Boolean).join("-"),
    secondaryOpened,
    isDesktop,
    onCloseSecondary,
  };
};
export const useSheet = () => {
  const context = useContext(CustomSheetContext);
  if (context === undefined) {
    throw new Error(
      "useCustomSheetContext must be used within a CustomSheetProvider"
    );
  }
  return context;
};
export function CustomSheet(props: Props) {
  return (
    <SheetProvider
      value={createCustomSheetContext({
        ...props,
      })}
    >
      <CustomSheetBase {...props} />
    </SheetProvider>
  );
}
function CustomSheetBase({
  children,
  open,
  onOpenChange,
  rounded,
  floating,
  sheetName,
  ...props
}: Props) {
  const sheet = useSheet();
  const { secondaryOpened, isDesktop } = sheet;
  return (
    <BaseSheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        id={sheet.nodeId}
        {...props}
        className={cn(
          "p-2 px-4",
          // "p-0 gap-0 bg-transparent",
          sheetContentVariant({
            ...(props as any),
            floating,
            rounded,
            size:
              isDesktop && secondaryOpened
                ? props.secondarySize || "5xl"
                : props.primarySize || "xl",
          })
        )}
      >
        {children}
      </SheetContent>
    </BaseSheet>
  );
}
function CustomSheetContentPortal({ children }) {
  // [`customSheetContent`,sheetId]
  const sheet = useSheet();
  const isDesktop = useMediaQuery(screens.xl);
  const nodeId = !isDesktop ? sheet.scrollContentId : sheet.nodeId;

  return (
    <>
      <Portal nodeId={sheet.nodeId} noDelay>
        {children}
      </Portal>
    </>
  );
}
export function CustomSheetContent({
  children = null,
  Header = null,
  className = "",
  secondary = false,
}) {
  const sheet = useSheet();

  return (
    <>
      {!Header || Header}
      <ScrollArea
        className={cn("s-mx-4 flex-1  spx-4", className, "flex flex-col")}
      >
        <div
          id={sheet.scrollContentId}
          className="flex flex-col gap-4 pb-36 sm:pb-16"
        >
          {children}
        </div>
      </ScrollArea>
    </>
  );
}
export function MultiSheetContent({ children = null, className = "" }) {
  const { secondaryOpened, isDesktop } = useSheet();
  return (
    <div id="multi-sheet-content" className="flex flex-1 overflow-hidden">
      {!isDesktop && secondaryOpened ? (
        children
      ) : (
        <div
          className={cn(
            "overflow-hidden flex flex-col flex-1",
            className,
            secondaryOpened && "pr-4"
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}
function PrimaryContent({ children }) {
  const { secondaryOpened, isDesktop } = useSheet();
  if (!isDesktop && secondaryOpened) return null;
  return children;
}

function CloseSecondary({}) {
  const sheet = useSheet();
  return (
    <Button
      onClick={(e) => {
        sheet?.onCloseSecondary();
      }}
      className="size-6 p-0"
      variant="destructive"
    >
      <Icons.chevronLeft className="size-4" />
    </Button>
  );
}
interface SecondaryHeaderProps {
  children?;
  title?;
  description?;
}
function SecondaryHeader(props: SecondaryHeaderProps) {
  return (
    <Portal nodeId={"secondary-header"} noDelay>
      {/* {props.children} */}
      <Sheet.Header className="bg-background flex-row items-start gap-4 space-y-0">
        <Sheet.CloseSecondary />
        <div className="grid gap-2">
          {props.children ? (
            props.children
          ) : (
            <>
              <Sheet.Title>{props.title}</Sheet.Title>
              <Sheet.Description>{props.description}</Sheet.Description>
            </>
          )}
        </div>
      </Sheet.Header>
    </Portal>
  );
}
function SecondaryFooter({ children, className = "" }) {
  return (
    <Portal nodeId={"secondary-footer"} noDelay>
      <Sheet.Footer className={cn(className)}>{children}</Sheet.Footer>
    </Portal>
  );
}
export function SecondarySheetContent({
  children = null,
  className = null,
  Header = null,
}) {
  return (
    <Portal nodeId={"multi-sheet-content"} noDelay>
      <div className="flex flex-col flex-1 bg-background">
        <div id="secondary-header"></div>
        <CustomSheetContent
          Header={Header}
          className={cn("flex flex-col", className)}
        >
          {children}
        </CustomSheetContent>
        <div id="secondary-footer"></div>
      </div>
    </Portal>
  );
}
export function SecondarySheetHeader({
  title = null,
  subtitle = null,
  ctx = null,
}) {
  return (
    <div className="fixed gap-8 top-0 flex px-2 mt-4">
      <div className="">
        <Button
          onClick={(e) => {
            if (ctx)
              ctx.setParams({
                secondaryTab: null,
              });
          }}
          size="xs"
          className="size-6 p-0"
          variant="secondary"
        >
          <Icons.arrowLeft className="size-3.5" />
        </Button>
      </div>
      <div className="flex flex-col">
        <Label className="text-lg">{title}</Label>
      </div>
    </div>
  );
}

const Sheet = Object.assign(CustomSheet, {
  MultiContent: MultiSheetContent,
  // SecondaryHeader: SecondarySheetHeader,
  SecondaryHeader,
  SecondaryContent: SecondarySheetContent,
  Content: CustomSheetContent,
  ScrollArea: CustomSheetContent,
  PrimaryContent: PrimaryContent,
  Portal: CustomSheetContentPortal,
  Footer: SheetFooter,
  SecondaryFooter: SecondaryFooter,
  Title: SheetTitle,
  Header: SheetHeader,
  Description: SheetDescription,
  Default: BaseSheet,
  CloseSecondary,
});

export default Sheet;
