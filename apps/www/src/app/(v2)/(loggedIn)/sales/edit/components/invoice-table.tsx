"use client";

import { useCallback, useContext, useEffect, useState } from "react";
import AutoComplete from "@/components/_v1/common/auto-complete";
import {
    Menu,
    MenuItem,
} from "@/components/_v1/data-table/data-table-row-actions";
import { Icons } from "@/components/_v1/icons";
import Money from "@/components/_v1/money";
import { screens } from "@/lib/responsive";
import { cn } from "@/lib/utils";
import { ISalesOrder } from "@/types/sales";
import { Layers } from "lucide-react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { useMediaQuery } from "react-responsive";

import { Button } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
import { FormField } from "@gnd/ui/form";
import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@gnd/ui/table";

import { SalesFormContext, SalesRowContext } from "../ctx";
import {
    useInvoiceItem,
    useInvoiceTotalEstimate,
} from "../hooks/use-invoice-estimate";
import useSalesInvoiceRowActions from "../hooks/use-row-actions";
import salesFormUtils from "../sales-form-utils";
import { ISalesForm } from "../type";
import EstimateFooter from "./estimate-footer";
import SupplierCell from "./supplier-cell";

export function InvoiceTable() {
    const form = useFormContext<ISalesForm>();
    const fieldArray = useFieldArray({
        control: form.control,
        name: "items",
    });
    const { fields, append } = fieldArray;

    useInvoiceTotalEstimate();

    const watchProfileEstimate = form.watch("meta.profileEstimate");
    const isMobile = useMediaQuery(screens.xs);
    const handleOndragEnd = (result) => {
        // if (!result.destination) return;
        // const items = Array.from(fields);
        // const [reorderedItem] = items.splice(result.source.index, 1);
        // items.splice(result.destination.index, 0, reorderedItem as any);
        // replace(items);
    };
    return (
        <div className={cn("relative", isMobile && "smax-md:overflow-x-auto")}>
            <SalesRowContext.Provider value={fieldArray}>
                <div className={cn("", isMobile && "max-md:w-[900px]")}>
                    {/* <DragDropContext onDragEnd={handleOndragEnd}>
                        <Droppable droppableId="dropper1">
                            {(provided) => ( */}
                    <Table
                        // role="list"
                        // ref={provided.innerRef}
                        // {...provided.droppableProps}
                        className=""
                    >
                        <InvoiceTableHeader
                            watchProfileEstimate={watchProfileEstimate}
                        />
                        <TableBody>
                            {fields.map((field, index) => (
                                <InvoiceTableRow
                                    key={index}
                                    length={fields.length}
                                    field={field}
                                    index={index}
                                />
                            ))}

                            {/* {provided.placeholder} */}
                        </TableBody>
                    </Table>
                    {/* )}
                        </Droppable>
                    </DragDropContext> */}
                    <div className="flex">
                        <Button
                            className="w-full"
                            onClick={() => {
                                append(salesFormUtils.moreInvoiceLines());
                            }}
                            variant="ghost"
                        >
                            More Lines
                        </Button>
                    </div>
                    <EstimateFooter />
                </div>
            </SalesRowContext.Provider>
        </div>
    );
}
function InvoiceTableRow({ index, field, length }) {
    const { data, profileEstimate } = useContext(SalesFormContext);
    const form = useFormContext<ISalesForm>();
    const item = useInvoiceItem(index);

    return (
        // <Draggable key={index} draggableId={field.id} index={index}>
        //     {(provided) => {
        //         return (
        <TableRow
            onMouseEnter={() => item.setHover(true)}
            onMouseLeave={() => item.setHover(false)}
            // {...provided.draggableProps}
            // {...provided.dragHandleProps}
            // ref={provided.innerRef}
            key={field.id}
            className="border-b-0 hover:bg-none"
        >
            <TableCell className="p-0 px-1 font-medium">{index + 1}</TableCell>
            <TableCell className="p-0 px-1">
                <InputHelper
                    index={index}
                    formKey={"meta.isComponent"}
                    checkbox
                />
            </TableCell>
            <TableCell className="p-0 px-1 py-0.5">
                <InputHelper
                    index={index}
                    onSelect={item.itemSelected}
                    formKey={"description"}
                    itemText={"description"}
                    itemValue={"description"}
                    perPage={25}
                    fuzzy
                    options={data.ctx.items}
                />
            </TableCell>
            <TableCell className="p-0 px-1">
                <InputHelper
                    index={index}
                    formKey={"swing"}
                    options={data.ctx.swings}
                />
            </TableCell>
            <TableCell className="p-0 px-1">
                <SupplierCell
                    rowHover={item.hover}
                    InputHelper={InputHelper}
                    index={index}
                    suppliers={data.ctx.suppliers}
                ></SupplierCell>
            </TableCell>
            <TableCell className="p-0 px-1">
                <InputHelper index={index} type="number" formKey={"qty"} />
            </TableCell>
            <TableCell className="p-0 px-1">
                <InputHelper index={index} type="number" formKey={"price"} />
            </TableCell>
            {profileEstimate && (
                <TableCell align="right" id="rate" className="p-0 px-1">
                    <Label className="whitespace-nowrap">
                        <Money value={item.rate} />
                    </Label>
                </TableCell>
            )}
            <TableCell align="right" id="total" className="p-0 px-1">
                <Label className="whitespace-nowrap">
                    <Money value={item.total} />
                </Label>
            </TableCell>
            <TableCell className="p-0 px-1">
                <InputHelper index={index} formKey={"meta.tax"} checkbox />
            </TableCell>
            <InvoiceTableRowActions
                field={field}
                cid={item.lid}
                length={length}
                index={index}
            />
        </TableRow>
        //         );
        //     }}
        // </Draggable>
    );
}
function InvoiceTableRowActions({ index, cid, field, length }) {
    const actions = useSalesInvoiceRowActions(index, cid, field);
    return (
        <TableCell className="p-0 px-1">
            <Menu variant={"ghost"}>
                {/* <MenuItem Icon={Icons.component}>Component</MenuItem> */}
                <MenuItem onClick={actions.clear} Icon={Icons.clear}>
                    Clear
                </MenuItem>
                <MenuItem onClick={actions.copy} Icon={Icons.copy}>
                    Copy
                </MenuItem>
                <MenuItem
                    disabled
                    SubMenu={
                        <div className="grid grid-cols-5 gap-1">
                            {Array(length)
                                .fill(null)
                                .map((_, pos) => (
                                    <MenuItem
                                        key={pos}
                                        className="inline-flex w-10 justify-center"
                                        disabled={pos == index}
                                        onClick={() => actions.move(pos)}
                                    >
                                        <span className="">{pos + 1}</span>
                                    </MenuItem>
                                ))}
                        </div>
                    }
                    Icon={Icons.move2}
                >
                    Move To
                </MenuItem>
                <MenuItem
                    SubMenu={
                        <>
                            <MenuItem
                                onClick={() => actions.addLine("before")}
                                Icon={Icons.arrowUp}
                            >
                                Before
                            </MenuItem>
                            <MenuItem
                                onClick={() => actions.addLine("after")}
                                Icon={Icons.arrowDown}
                            >
                                After
                            </MenuItem>
                        </>
                    }
                    Icon={Icons.add}
                >
                    Add Line
                </MenuItem>
                <MenuItem onClick={actions.remove} Icon={Icons.trash}>
                    Delete
                </MenuItem>
            </Menu>
        </TableCell>
    );
}
function InvoiceTableHeader({ watchProfileEstimate }) {
    return (
        <TableHeader>
            <TableRow>
                <TableHead className="w-[25px]  px-1">#</TableHead>
                <TableHead className="w-5 px-1">
                    <Layers className="h-3.5 w-3.5" />
                </TableHead>
                <TableHead className="px-1">Item</TableHead>
                <TableHead className="w-20  px-1">Swing</TableHead>
                <TableHead className="w-20 px-1">Supplier</TableHead>
                <TableHead className="w-14 px-1 text-center">Qty</TableHead>
                <TableHead className="w-20 px-1">Cost</TableHead>
                {watchProfileEstimate ? (
                    <>
                        <TableHead className="w-8 px-1">Rate</TableHead>
                    </>
                ) : (
                    <></>
                )}
                <TableHead className="w-8 px-1 text-right">Total</TableHead>
                <TableHead className="w-8 px-1 text-center">Tax</TableHead>
                <TableHead className="w-10 px-1"></TableHead>
            </TableRow>
        </TableHeader>
    );
}
interface InputHelperProps {
    index;
    formKey;
    options?;
    itemText?;
    itemValue?;
    checkbox?: boolean;
    fuzzy?: boolean;
    onSelect?;
    perPage?;
    type?;
    watchValue?;
}
function InputHelper({
    index,
    formKey,
    checkbox,
    watchValue,
    ...props
}: InputHelperProps) {
    const form = useFormContext<ISalesOrder>();
    const ctx = useContext(SalesRowContext);
    const valueKey: any = `items.${index}.${formKey}`;
    const [wValue] = watchValue || form.watch([valueKey]);
    // useEffect(() => {},[formKey])

    const [expression, setExpression] = useState("");
    const keyDown = useCallback(
        (e) => {
            let k = e.key;
            if (
                props.type == "number" &&
                !(+k > -1) &&
                k?.length == 1 &&
                k != "."
            ) {
                e.preventDefault();
            }
            if (props.type == "number") {
                //
                if (["+", "-", "/", "*", "%"].includes(k)) {
                    setExpression((ex) => {
                        return [ex, wValue, ` ${k} `].join("");
                    });
                    form.setValue(valueKey, "");
                }
                if (k == "=" || k == "Enter") {
                    setExpression((ex) => {
                        const exp = `${ex}${wValue}`;

                        const res = eval(exp) as any;

                        form.setValue(valueKey, res);
                        return "";
                    });
                }
                if (k == "Escape") {
                    setExpression("");
                }
            }
        },
        [wValue, valueKey, index, form, props, setExpression],
    );
    // ctx.
    return (
        <div className="relative">
            {expression && (
                <div className="absolute -top-[60px] z-10 w-full rounded-xl border bg-white p-2 shadow-xl">
                    {expression
                        ?.split(" ")
                        .filter(Boolean)
                        .map((e, i) => <p key={i}>{e}</p>)}
                </div>
            )}
            <FormField<ISalesOrder>
                name={`items.${index}.${formKey}` as any}
                control={form.control}
                render={({ field }) =>
                    checkbox ? (
                        <Checkbox
                            id="component"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                        />
                    ) : props.options ? (
                        <AutoComplete
                            uppercase
                            allowCreate
                            className="h-8 p-1 font-medium uppercase"
                            {...props}
                            // value={field.value}
                            // onChange={field.onChange}
                            {...field}
                        />
                    ) : (
                        <Input
                            className="h-8 p-1 font-medium uppercase"
                            {...field}
                            {...props}
                            // onKeyDown={keyDown}
                        />
                    )
                }
            />
        </div>
    );
}
