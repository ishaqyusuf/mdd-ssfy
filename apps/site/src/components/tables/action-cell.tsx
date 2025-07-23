import { cn } from "@gnd/ui/cn";

import { useTable } from ".";
import ConfirmBtn from "../confirm-button";
import { Menu } from "../(clean-code)/menu";

interface Props {
    Menu?;
    trash?: boolean;
    disableTrash?: boolean;
    itemId;
    children?;
}
export function ActionCell(props: Props) {
    const { tableMeta } = useTable();
    const deletable = props?.trash && !!tableMeta?.deleteAction;
    return (
        <div className="flex items-center justify-end gap-2">
            {props.children}
            {deletable ? (
                <div className="hidden sm:block">
                    <ConfirmBtn
                        trash
                        disabled={props?.disableTrash}
                        size="sm"
                        onClick={(e) => {
                            tableMeta?.deleteAction(props.itemId);
                        }}
                    />
                </div>
            ) : (
                <></>
            )}

            {!!props.Menu || deletable ? (
                <div className={cn(!props.Menu && "sm:hidden")}>
                    <Menu>
                        <props.Menu />
                    </Menu>
                </div>
            ) : (
                <></>
            )}
        </div>
    );
}
