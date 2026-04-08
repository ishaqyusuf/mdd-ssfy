import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
  useTransition,
  createContext,
  useContext,
} from "react";
// import { useRouter } from "next/navigation";
import { Icon, IconKeys, Icons } from "../icons";
import { cn } from "../../utils";

import { VariantProps } from "class-variance-authority";
import { toast } from "sonner";

import { Button, buttonVariants } from "@gnd/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuItemProps,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";

import { ScrollArea } from "@gnd/ui/scroll-area";

type MenuItemProps = {
  link?;
  href?;
  Icon?: IconKeys | React.JSXElementConstructor<any>;
  SubMenu?;
  shortCut?;
  _blank?: boolean;
  icon?: IconKeys;
} & DropdownMenuItemProps;
interface RowActionMoreMenuProps {
  children;
  disabled?: boolean;
  label?;
  Icon?: IconKeys | React.JSXElementConstructor<any>;
  Trigger?;
  noSize?: boolean;
  variant?: VariantProps<typeof buttonVariants>["variant"];
  hoverVariant?: VariantProps<typeof buttonVariants>["variant"];
  triggerSize?: VariantProps<typeof buttonVariants>["size"];
  open?;
  onOpenChanged?;
  className?: string;
  // dir?:  ComponentPropsWithoutRef<>
}
type MenuContext = ReturnType<typeof createMenuContext>;
export const MenuContext = createContext<MenuContext>(undefined);
export const MenuProvider = MenuContext.Provider;
export const createMenuContext = (props: RowActionMoreMenuProps, ref) => {
  const [_open, _onOpenChanged] = useState(props.open);
  useImperativeHandle(ref, () => ({
    _onOpenChanged,
    async run(fn) {
      await fn();
    },
  }));
  const [hover, setHover] = useState(false);
  const [disabled, setDisabled] = useState(false);
  useEffect(() => {
    setDisabled(false);
  }, [_open]);
  return {
    _open,
    _onOpenChanged,
    setHover,
    hover,
    disabled,
    setDisabled,
  };
};
export const useMenuContext = () => {
  const context = useContext(MenuContext);
  if (context === undefined) {
    throw new Error("useMenuContext must be used within a MenuProvider");
  }
  return context;
};
function BaseMenu(props: RowActionMoreMenuProps, ref) {
  const {
    children,
    Icon: MenuIcon = Icons.Menu,
    label,
    disabled,
    Trigger,
    noSize,
    open,
    onOpenChanged,
    triggerSize,
    variant = "outline",
    hoverVariant,
    className,
  } = props;
  const value = createMenuContext(props, ref);
  const { _open, _onOpenChanged, setHover, hover } = value;
  const triggerIconName =
    typeof MenuIcon === "string" ? (MenuIcon as IconKeys) : undefined;
  const triggerIconComponent =
    typeof MenuIcon === "string" ? undefined : MenuIcon;
  return (
    <MenuContext.Provider value={value}>
      <DropdownMenu
        open={onOpenChanged ? open : _open}
        onOpenChange={onOpenChanged || _onOpenChanged}
      >
        <DropdownMenuTrigger
          onMouseEnter={(e) => {
            setHover(true);
          }}
          onMouseLeave={(e) => setHover(false)}
          asChild
        >
          {Trigger ? (
            Trigger
          ) : (
            <Button
              disabled={disabled}
              variant={open || hover ? hoverVariant || variant : variant}
              size={triggerSize}
              className={cn(
                "flex h-8 space-x-4",
                !label && "w-8 p-0",
                variant == "default"
                  ? "data-[state=open]:bg-muted-foreground"
                  : "data-[state=open]:bg-muted",
                triggerSize == "sm" && "h-6 w-6",
              )}
            >
              <Icon
                name={triggerIconName}
                Icon={triggerIconComponent}
                className="h-4 w-4"
              />
              {label && <span className="">{label}</span>}
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className={cn(!noSize && "w-[185px]", className)}
        >
          {children}
        </DropdownMenuContent>
      </DropdownMenu>
    </MenuContext.Provider>
  );
}

function Item({
  link,
  href,
  children,
  Icon: ItemIcon,
  SubMenu,
  onClick,
  _blank,
  icon: iconName,
  shortCut,
  className,
  ...props
}: MenuItemProps) {
  const { disabled } = useMenuContext();
  const itemIconName =
    iconName || (typeof ItemIcon === "string" ? (ItemIcon as IconKeys) : undefined);
  const itemIconComponent =
    typeof ItemIcon === "string" ? undefined : ItemIcon;

  // Lucide.ALargeSmall
  if (SubMenu)
    return (
      <DropdownMenuSub {...props}>
        <DropdownMenuSubTrigger>
          {iconName || ItemIcon ? (
            <Icon
              name={itemIconName}
              Icon={itemIconComponent}
              className="mr-2 size-4 text-muted-foreground/70"
            />
          ) : null}
          {children}
          {!!shortCut && (
            <>
              <div className="flex-1"></div>
              <DropdownMenuShortcut className="pl-4">
                {shortCut}
              </DropdownMenuShortcut>
            </>
          )}
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          <ScrollArea className={cn("max-h-[55vh] overflow-auto", className)}>
            {SubMenu}
          </ScrollArea>
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    );

  const Frag = () => (
    <DropdownMenuItem
      {...props}
      disabled={props.disabled || disabled}
      onClick={link || href ? null : (onClick as any)}
      className={cn("gap-2", className)}
    >
      <Icon
        name={itemIconName}
        Icon={itemIconComponent}
        className="h-3.5 w-3.5 text-muted-foreground/70"
      />
      {children}
      {!!shortCut && (
        <>
          <div className="flex-1"></div>
          <DropdownMenuShortcut className="pl-4">
            {shortCut}
          </DropdownMenuShortcut>
        </>
      )}
    </DropdownMenuItem>
  );
  // if (link || href)
  //     return (
  //         <LinkableNode _blank={_blank} href={link || href}>
  //             <Frag />
  //         </LinkableNode>
  // );
  return <Frag />;
}

interface TrashProps {
  action?;
  children?;
  loadingText?;
  successText?;
  errorText?;
  variant?: "Trash" | "primary";
}
function Trash({ action, children, ...props }: TrashProps) {
  const [confirm, setConfirm] = useState(false);
  // const router = useRouter();
  const [isPending, startTransition] = useTransition();
  return (
    <DropdownMenuItem
      onClick={(e) => {
        e.preventDefault();
        if (!confirm) {
          setConfirm(true);
          setTimeout(() => {
            setConfirm(false);
          }, 3000);
          return;
        }
        setConfirm(false);
        startTransition(async () => {
          toast.promise(
            async () => {
              if (action) {
                await action();
                // if (!noRefresh)
                // router.refresh();
              }
              // revalidatePath("");
            },
            {
              loading: props.loadingText || `Deleting...`,
              success(data) {
                return props.successText || "Deleted Successfully";
              },
              error: props.errorText || "Unable to completed Delete Action",
            },
          );
        });
      }}
      className={cn(
        (!props.variant || props.variant == "Trash") &&
          "text-red-500 hover:text-red-600",
        props.variant == "primary" && "",
        "gap-2",
      )}
    >
      <Icon
        name={isPending ? "Spinner" : confirm ? "Warn" : "Trash"}
        variant="destructive"
        className={cn(isPending ? "h-3.5 w-3.5 animate-spin" : "h-4 w-4", "")}
      />
      <span>{confirm ? "Sure?" : children}</span>
      <DropdownMenuShortcut>⌘⌫</DropdownMenuShortcut>
    </DropdownMenuItem>
  );
}
// function LinkableNode({
//     href,
//     As,
//     children,
//     _blank,
//     ...props
// }: any & { href?; className?; As?; _blank?: boolean }) {
//     if (href)
//         return (
//             <Link
//                 {...(props as any)}
//                 className={cn("hover:underline", props?.className)}
//                 target={_blank && "_blank"}
//                 href={href}
//             >
//                 {children}
//             </Link>
//         );
//     return <div {...props}>{children}</div>;
// }
export let Menu = Object.assign(forwardRef(BaseMenu), {
  Item,
  Label: DropdownMenuLabel,
  Separator: DropdownMenuSeparator,
  Trash,
});
