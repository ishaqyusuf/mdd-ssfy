"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
// import type { Dispatch, DispatchItem } from "@/types/dispatch";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@gnd/ui/button";
import { Calendar } from "@gnd/ui/calendar";
import { Checkbox } from "@gnd/ui/checkbox";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@gnd/ui/form";
import { Input } from "@gnd/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@gnd/ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@gnd/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@gnd/ui/table";
import { Textarea } from "@gnd/ui/textarea";

import { DispatchFormFooter } from "./dispatch-form-footer";

const availableItems: any[] = [
    { id: "ITEM-001", name: "Product A", availableQty: 100, dispatchQty: 0 },
    { id: "ITEM-002", name: "Product B", availableQty: 75, dispatchQty: 0 },
    { id: "ITEM-003", name: "Product C", availableQty: 200, dispatchQty: 0 },
    { id: "ITEM-004", name: "Product D", availableQty: 50, dispatchQty: 0 },
    { id: "ITEM-005", name: "Product E", availableQty: 150, dispatchQty: 0 },
    { id: "ITEM-006", name: "Product F", availableQty: 80, dispatchQty: 0 },
];

// Mock data for assignees
const assignees = [
    { id: "1", name: "John Doe" },
    { id: "2", name: "Jane Smith" },
    { id: "3", name: "Mike Johnson" },
    { id: "4", name: "Sarah Williams" },
];

const formSchema = z.object({
    date: z.date(),
    assignedTo: z.string(),
    method: z.enum(["Pickup", "Delivery"]),
    notes: z.string().optional(),
    items: z.array(
        z.object({
            id: z.string(),
            name: z.string(),
            availableQty: z.number(),
            dispatchQty: z.number().min(0),
        }),
    ),
});

interface DispatchFormProps {
    dispatch?: any;
    onSubmit?: (values: any) => void;
    onCancel?: () => void;
}

export function DispatchForm({
    dispatch,
    onSubmit,
    onCancel,
}: DispatchFormProps) {
    const [selectedItems, setSelectedItems] = useState<any[]>(
        dispatch?.items || [],
    );
    const [allSelected, setAllSelected] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            date: dispatch?.date || new Date(),
            assignedTo: dispatch?.assignedTo || "",
            method: dispatch?.method || "Pickup",
            notes: dispatch?.notes || "",
            items: dispatch?.items || [],
        },
    });

    const handleSelectAll = (checked: boolean) => {
        setAllSelected(checked);
        if (checked) {
            setSelectedItems(
                availableItems.map((item) => ({ ...item, dispatchQty: 0 })),
            );
        } else {
            setSelectedItems([]);
        }
    };

    const handleItemSelection = (item: any, checked: boolean) => {
        if (checked) {
            setSelectedItems((prev) => [...prev, { ...item, dispatchQty: 0 }]);
        } else {
            setSelectedItems((prev) => prev.filter((i) => i.id !== item.id));
        }
    };

    const handleQuantityChange = (itemId: string, quantity: number) => {
        setSelectedItems((prev) =>
            prev.map((item) =>
                item.id === itemId ? { ...item, dispatchQty: quantity } : item,
            ),
        );
    };

    const handleSubmit = (values: z.infer<typeof formSchema>) => {
        const newDispatch: any = {
            id:
                dispatch?.id ||
                `DISP-${Math.floor(Math.random() * 1000)
                    .toString()
                    .padStart(3, "0")}`,
            date: values.date,
            assignedTo: values.assignedTo,
            status: dispatch?.status || "Queue",
            method: values.method,
            notes: values.notes || "",
            items: selectedItems,
        };

        onSubmit(newDispatch);
    };

    return (
        <Form {...form}>
            <form
                onSubmit={form.handleSubmit(handleSubmit)}
                className="space-y-6"
            >
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="date"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Dispatch Date</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                                variant={"outline"}
                                                className={cn(
                                                    "w-full pl-3 text-left font-normal",
                                                    !field.value &&
                                                        "text-muted-foreground",
                                                )}
                                            >
                                                {field.value ? (
                                                    format(field.value, "PPP")
                                                ) : (
                                                    <span>Pick a date</span>
                                                )}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent
                                        className="w-auto p-0"
                                        align="start"
                                    >
                                        <Calendar
                                            mode="single"
                                            selected={field.value}
                                            onSelect={field.onChange}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="assignedTo"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Assigned To</FormLabel>
                                <Select
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                >
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select assignee" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {assignees.map((assignee) => (
                                            <SelectItem
                                                key={assignee.id}
                                                value={assignee.name}
                                            >
                                                {assignee.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="method"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Dispatch Method</FormLabel>
                            <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                            >
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select method" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="Pickup">
                                        Pickup
                                    </SelectItem>
                                    <SelectItem value="Delivery">
                                        Delivery
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Dispatch Notes</FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder="Add any special instructions or notes here"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div>
                    <div className="mb-4 flex items-center justify-between">
                        <h4 className="font-medium">Dispatchable Items</h4>
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="select-all"
                                checked={allSelected}
                                onCheckedChange={(checked) =>
                                    handleSelectAll(checked as boolean)
                                }
                            />
                            <label
                                htmlFor="select-all"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                Select All
                            </label>
                        </div>
                    </div>

                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]"></TableHead>
                                    <TableHead>Item</TableHead>
                                    <TableHead>Available Qty</TableHead>
                                    <TableHead>Dispatch Qty</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {availableItems.map((item) => {
                                    const isSelected = selectedItems.some(
                                        (i) => i.id === item.id,
                                    );
                                    const selectedItem = selectedItems.find(
                                        (i) => i.id === item.id,
                                    );

                                    return (
                                        <TableRow key={item.id}>
                                            <TableCell>
                                                <Checkbox
                                                    checked={isSelected}
                                                    onCheckedChange={(
                                                        checked,
                                                    ) =>
                                                        handleItemSelection(
                                                            item,
                                                            checked as boolean,
                                                        )
                                                    }
                                                />
                                            </TableCell>
                                            <TableCell>{item.name}</TableCell>
                                            <TableCell>
                                                {item.availableQty}
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    max={item.availableQty}
                                                    value={
                                                        selectedItem?.dispatchQty ||
                                                        0
                                                    }
                                                    onChange={(e) =>
                                                        handleQuantityChange(
                                                            item.id,
                                                            Number.parseInt(
                                                                e.target.value,
                                                            ) || 0,
                                                        )
                                                    }
                                                    disabled={!isSelected}
                                                    className="w-20"
                                                />
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </div>
                <DispatchFormFooter />
            </form>
        </Form>
    );
}
