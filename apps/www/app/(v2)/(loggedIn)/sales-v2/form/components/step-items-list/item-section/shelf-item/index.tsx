import { useContext } from "react";
import { generateRandomString } from "@/lib/utils";
import { useFieldArray } from "react-hook-form";

import { Button } from "@gnd/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@gnd/ui/table";

import {
    DykeItemFormContext,
    useDykeForm,
} from "../../../../_hooks/form-context";
import ShelfItemsBlock from "./shelf-items-block";

export default function ShelfItemIndex() {
    const item = useContext(DykeItemFormContext);
    const form = useDykeForm();
    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: `itemArray.${item.rowIndex}.item.shelfItemArray`,
    });

    return (
        <Table>
            <TableHeader className="">
                <TableRow>
                    <TableHead className="w-10">Item</TableHead>
                    <TableHead className="w-1/4">Category</TableHead>
                    <TableHead className="flex  w-full  items-center space-x-4">
                        <div className="flex-1">Product</div>
                        <div className="w-20">Qty</div>
                        <div className="w-24 text-right">Rate</div>
                        <div className="w-24 text-right">Line Total</div>
                        <div className="w-12"></div>
                    </TableHead>
                    {/* <TableHead>Product</TableHead> */}
                    {/* <TableHead>Qty</TableHead> */}
                    {/* <TableHead>Rate</TableHead> */}
                    {/* <TableHead>Line Total</TableHead> */}
                </TableRow>
            </TableHeader>
            <TableBody>
                {fields.map((field, index) => (
                    <ShelfItemsBlock
                        deleteItem={() => {
                            remove(index);
                        }}
                        key={field.id}
                        shelfIndex={index}
                    />
                ))}
                <TableRow>
                    <TableCell colSpan={2}>
                        <div className="">
                            <Button
                                onClick={() => {
                                    append({
                                        categoryIds: [null as any],
                                        productArray: [
                                            {
                                                item: {} as any,
                                            },
                                        ],
                                        uid: generateRandomString(4),
                                        categoryId: null as any,
                                    });
                                }}
                                variant="outline"
                            >
                                <span>Add Shelf Item</span>
                            </Button>
                        </div>
                    </TableCell>
                </TableRow>
            </TableBody>
        </Table>
    );
}
