"use client";

import { useEffect, useState } from "react";
import {
    _getSalesFormAction,
    SalesFormResponse,
} from "@/app/(v1)/(loggedIn)/sales/_actions/get-sales-form";
import AutoComplete from "@/components/_v1/common/auto-complete";
import {
    Menu,
    MenuItem,
} from "@/components/_v1/data-table/data-table-row-actions";
import dayjs from "dayjs";
import { useFieldArray, useForm } from "react-hook-form";

import { Form, FormField } from "@gnd/ui/form";
import { Input } from "@gnd/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@gnd/ui/table";

export default function InvoiceTable() {
    const form = useForm({
        defaultValues: {
            tasks: [
                { description: "hello world", meta: {} },
                { description: "hi world", meta: {} },
            ],
        },
    });
    const [items, setItems] = useState<any[]>([]);
    useEffect(() => {
        (async () => {
            const resp: SalesFormResponse = await _getSalesFormAction({
                orderId: "new",
                type: "order",
            });
            // resp.ctx.items
            setItems(resp.ctx.items);
        })();
    }, []);
    const { fields, swap, replace, update, append, insert, move, remove } =
        useFieldArray({
            control: form.control,
            name: "tasks",
        });
    return (
        <div>
            <p>Invoice Table</p>
            <Form {...form}>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Supplier</TableHead>
                            <TableHead>Swing</TableHead>
                            <TableHead>Cost</TableHead>
                            <TableHead>Qty</TableHead>
                            <TableHead></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {fields.map((field, index) => (
                            <TableRow key={field.id}>
                                <TableCell>{index + 1}</TableCell>
                                {[
                                    "description",
                                    "supplier",
                                    "swing",
                                    "cost",
                                    "qty",
                                ].map((k) => (
                                    <TableCell key={k}>
                                        <FormField
                                            name={`tasks.${index}.${k}`}
                                            render={({ field }) =>
                                                k == "description" ? (
                                                    <AutoComplete
                                                        {...field}
                                                        allowCreate
                                                        options={items}
                                                        itemText={"description"}
                                                        itemValue={
                                                            "description"
                                                        }
                                                        onSelect={(e) => {
                                                            console.log(e);
                                                        }}
                                                    />
                                                ) : (
                                                    <Input
                                                        className=""
                                                        {...field}
                                                    />
                                                )
                                            }
                                        />
                                    </TableCell>
                                ))}
                                <TableCell>
                                    <Menu>
                                        <MenuItem
                                            SubMenu={
                                                <>
                                                    <MenuItem
                                                        onClick={() => {
                                                            if (index != 0)
                                                                move(
                                                                    index,
                                                                    index - 1,
                                                                );
                                                        }}
                                                    >
                                                        Up
                                                    </MenuItem>
                                                    <MenuItem
                                                        onClick={() => {
                                                            if (
                                                                index !=
                                                                fields.length -
                                                                    1
                                                            )
                                                                move(
                                                                    index,
                                                                    index + 1,
                                                                );
                                                        }}
                                                    >
                                                        Down
                                                    </MenuItem>
                                                </>
                                            }
                                        >
                                            Move
                                        </MenuItem>
                                        <MenuItem
                                            SubMenu={
                                                <>
                                                    <MenuItem
                                                        onClick={() => {
                                                            // if (index != 0)
                                                            insert(index, {
                                                                description:
                                                                    dayjs().toISOString(),
                                                            } as any);
                                                        }}
                                                    >
                                                        Up
                                                    </MenuItem>
                                                    <MenuItem
                                                        onClick={() => {
                                                            insert(index + 1, {
                                                                description:
                                                                    dayjs().toISOString(),
                                                            } as any);
                                                        }}
                                                    >
                                                        Down
                                                    </MenuItem>
                                                </>
                                            }
                                        >
                                            Add Line
                                        </MenuItem>
                                        <MenuItem
                                            onClick={() => {
                                                remove(index);
                                                insert(index, {
                                                    description: "",
                                                    meta: {},
                                                });
                                            }}
                                        >
                                            Clear Line
                                        </MenuItem>
                                        <MenuItem
                                            onClick={() => {
                                                const { id, ...data } = fields[
                                                    index
                                                ] as any;
                                                insert(index, data);
                                            }}
                                        >
                                            Copy
                                        </MenuItem>
                                    </Menu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Form>
        </div>
    );
}
