import { useRef, useState } from "react";

import { motion } from "framer-motion";
import { toast } from "sonner";

import { Button } from "@gnd/ui/button";
import { Label } from "@gnd/ui/label";
import { useTable } from ".";
import { cn } from "../../../utils";
import { IconKeys, Icons } from "../icons";
import { Menu } from "../menu";
import { ConfirmBtn } from "../confirm-button";

export function BatchAction({ children = null }) {
  const { table, ...ctx } = useTable();
  const selectCount = ctx.selectedRows?.length;
  const total = ctx.totalRowsFetched;
  const ref = useRef(undefined);
  const [show, setShow] = useState(false);
  if (!ctx.checkbox) return null;
  return (
    <div
      ref={ref}
      className={cn(
        show
          ? "fixed bottom-10 left-1/2 z-10 m-4 -translate-x-1/2 transform"
          : "hidden"
      )}
    >
      <motion.div
        onAnimationStart={(e) => {
          setShow(true);
        }}
        // onAnimationEnd={(e) => {}}
        onViewportEnter={(e) => {
          setShow(true);
        }}
        initial={{ opacity: 0, scale: 0 }}
        animate={{
          opacity: ctx.checkbox ? 1 : 0,
          scale: ctx.checkbox ? 1 : 0,
        }}
        //@ts-ignore
        className="sgap-4 relative flex items-center divide-x divide-muted-foreground/50 overflow-hidden rounded-xl border border-muted-foreground/50 bg-white shadow-xl"
      >
        {/* <div className="border flex sgap-4 items-center rounded-xl bg-white overflow-hidden border-muted-foreground/50 divide-x divide-muted-foreground/50 shadow-xl  relative "> */}
        <Label className="px-2 font-mono">
          <span className="font-bold">{selectCount}</span>
          {" of "}
          <span className="font-bold">{total}</span>
          {" selected"}
        </Label>
        {children}
        <Button
          className="rounded-none"
          onClick={() => {
            table.toggleAllPageRowsSelected(false);
          }}
          variant="ghost"
        >
          <Icons.X className="size-4" />
        </Button>
        {/* </div> */}
      </motion.div>
    </div>
  );
}

interface BatchBtnProps {
  icon?: IconKeys;
  children?;
  menu?;
  onClick?;
}
export function BatchBtn(props: BatchBtnProps) {
  const Icon = Icons[props.icon];
  if (props.menu)
    return (
      <Menu
        Trigger={
          <Button className="rounded-none" variant="ghost">
            {Icon && <Icon className={cn("mr-2 size-3.5")} />}
            {props.children}
          </Button>
        }
      >
        {props.menu}
      </Menu>
    );
  return <Button>{props.children}</Button>;
}
export function BatchDelete(props: BatchBtnProps) {
  let ctx = useTable();
  return (
    <ConfirmBtn
      onClick={async () => {
        await props?.onClick();
        toast.success("Delete successful");
        ctx.table.toggleAllPageRowsSelected(false);
        // ctx.refetch();
      }}
      variant="ghost"
      trash
      className="rounded-none text-red-600"
    >
      {/* <div className="flex items-center"> */}
      {/* <Icons.trash className="size-3.5 mr-2" /> */}
      <span>Delete</span>
      {/* </div> */}
    </ConfirmBtn>
  );
}
