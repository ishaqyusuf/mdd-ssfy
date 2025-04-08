import { TCell } from "@/components/(clean-code)/data-table/table-cells";
import Button from "@/components/common/button";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";
import { Icons } from "@gnd/ui/icons";
import { Table, TableBody, TableCell, TableRow } from "@gnd/ui/table";

import { useTakeOffForm } from "./take-off-form";

interface Props {
    listIndex;
}
export function AddTakeOffComponent({ listIndex }: Props) {
    const ctx = useTakeOffForm();
    const components = ctx.components;
    return (
        <div className="flex  justify-end">
            <DropdownMenu>
                <DropdownMenuTrigger>
                    <Button>
                        <Icons.Add className="size-4" />
                        <span>Add</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="p-2">
                    <Table>
                        <TableBody>
                            {components?.map((item) => (
                                <TableRow key={item.itemControlUid}>
                                    <TableCell>
                                        <TCell.Primary>
                                            {item.title}
                                        </TCell.Primary>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
