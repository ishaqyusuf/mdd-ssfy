import { cn } from "@gnd/ui/cn";

import { useTable } from ".";
import ConfirmBtn from "../confirm-button";

interface Props {
    Menu?;
    trash?: boolean;
    itemId;
    children?;
}
export function ActionCell(props: Props) {
    const { tableMeta } = useTable();
    const deletable = props?.trash && !!tableMeta?.deleteAction;
    return (
        <div className="flex items-center justify-end gap-2">
            {deletable ? (
                <div className="hidden sm:block">
                    <ConfirmBtn
                        trash
                        size="sm"
                        onClick={(e) => {
                            tableMeta?.deleteAction(props.itemId);
                        }}
                    />
                </div>
            ) : (
                <></>
            )}
            {/* {!!props.Menu || deletable ? (
        <div className={cn(!props.Menu && "sm:hidden")}>
          <Menu>
            <props.Menu />
            <Menu.Item>Hello HEE</Menu.Item>
          </Menu>
        </div>
      ) : (
        <></>
      )} */}
            {props.children}
        </div>
    );
}
