"use client";

import { Button } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
import { Icons } from "@gnd/ui/icons";
import { Popover, PopoverContent, PopoverTrigger } from "@gnd/ui/popover";
import { useSalesOrdersStore } from "@/store/sales-orders";

export function SalesOrdersV2ColumnVisibility() {
    const { columns } = useSalesOrdersStore();

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline" size="icon">
                    <Icons.Tune size={18} />
                </Button>
            </PopoverTrigger>

            <PopoverContent className="w-[200px] p-0" align="end" sideOffset={8}>
                <div className="flex flex-col p-4 space-y-2 max-h-[450px] overflow-auto">
                    {columns
                        .filter(
                            (column) =>
                                column.columnDef.enableHiding !== false &&
                                column.id !== "actions",
                        )
                        .map((column) => {
                            const meta = column.columnDef.meta as
                                | { headerLabel?: string }
                                | undefined;
                            const label =
                                meta?.headerLabel ??
                                column.columnDef.header?.toString() ??
                                column.id;

                            return (
                                <div
                                    key={column.id}
                                    className="flex items-center space-x-2"
                                >
                                    <Checkbox
                                        id={column.id}
                                        checked={column.getIsVisible()}
                                        onCheckedChange={(checked) =>
                                            column.toggleVisibility(
                                                checked === true,
                                            )
                                        }
                                    />
                                    <label
                                        htmlFor={column.id}
                                        className="text-sm peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                    >
                                        {label}
                                    </label>
                                </div>
                            );
                        })}
                </div>
            </PopoverContent>
        </Popover>
    );
}
