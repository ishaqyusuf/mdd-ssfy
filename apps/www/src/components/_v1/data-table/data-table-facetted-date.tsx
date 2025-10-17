import { useEffect, useState } from "react";
import { typedMemo } from "@/lib/hocs/typed-memo";
import { formatDate } from "@/lib/use-day";
import { DataTableFilterableColumn } from "@/types/data-table";
import { Column, Table } from "@tanstack/react-table";
import { CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";

import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@gnd/ui/popover";
import { Separator } from "@gnd/ui/separator";

import { Calendar } from "@gnd/ui/calendar";
import { Checkbox } from "@gnd/ui/checkbox";
import { DataTableFacetedFilter } from "./data-table-faceted-filter";
import { DataTableFacetedFilter2 } from "./data-table-faceted-filter-2";

interface DataTableFacetedFilter<TData, TValue> {
    title?: string;

    filter?: DataTableFilterableColumn<TData, TValue>;
    range?;
    column?: Column<TData, TValue>;
    dateTypeColumn?: Column<TData, TValue>;
    rangeSwitch?: Boolean;
    table: Table<TData>;
}

export function DataTableFacetedDate<TData, TValue>({
    title = "Date",
    column,
    rangeSwitch,
    filter,
    dateTypeColumn,
    range,
    table,
}: DataTableFacetedFilter<TData, TValue>) {
    // const column: Column<TData, TValue> | undefined = table.getColumn(
    //   "_date"
    // ) as any;
    // const dateTypecolumn: Column<TData, TValue> | undefined = table.getColumn(
    //   "_dateType"
    // ) as any;

    const [open, setOpen] = useState(false);
    const [_title, setTitle] = useState<string | undefined>();
    const [dateRange, setDateRange] = useState(range);

    const [date, setDate] = useState<DateRange | undefined | Date>();
    const fv = column?.getFilterValue();

    useEffect(() => {
        const cVal = fv;
        // if (!cVal) return;
        // const isArray = Array.isArray(cVal);
        // let _v = isArray ? cVal : [cVal];
        // const [from, to] = _v.map((_) => new Date(_));
        // const _d = (
        //   from && to
        //     ? {
        //         from,
        //         to,
        //       }
        //     : from
        // ) as any;
        setDateRange(!(cVal instanceof Date));
        setDate(cVal as any);
    }, [fv]);

    const dtc = dateTypeColumn?.getFilterValue();
    function setFilterTitle() {
        const newTitle = filter?.options?.find((t) => t.value == dtc)?.label;
        setTitle(newTitle || _title);
    }
    useEffect(() => {
        setFilterTitle();
    }, []);
    useEffect(() => {
        setFilterTitle();
    }, [dtc]);
    if (!column || !column.id) {
        return null;
    }
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="h-8 border-dashed"
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {_title || title}
                    <Separator orientation="vertical" className="mx-2 h-4" />
                    {date && date instanceof Date ? (
                        <Badge
                            variant="secondary"
                            className="rounded-sm px-1 font-normal"
                        >
                            {formatDate(date, "YYYY-MM-DD")}
                        </Badge>
                    ) : null}
                    <RangeText date={date} />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
                <div className="flex justify-end space-x-2 p-2 px-4 pt-4">
                    {filter &&
                        table.getColumn(filter.id ? String(filter.id) : "") && (
                            <DataTableFacetedFilter2
                                key={String(filter.id)}
                                column={table.getColumn(
                                    filter.id ? String(filter.id) : "",
                                )}
                                title={filter.title}
                                single={filter.single}
                                options={filter.options}
                                defaultValue={filter.defaultValue}
                            />
                        )}

                    {rangeSwitch && (
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="sameAddress"
                                checked={dateRange}
                                onCheckedChange={(e) => {
                                    setDateRange(e);
                                    setDate(null as any);
                                }}
                            />
                            <label
                                htmlFor="sameAddress"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                Range
                            </label>
                        </div>
                    )}
                </div>
                <Calendar
                    initialFocus
                    mode={(dateRange ? "range" : "single") as any}
                    selected={date}
                    onSelect={(e) => {
                        setDate(e);

                        let fd: any = null;
                        if (e instanceof Date) {
                            setOpen(false);
                            fd = formatDate(e, "YYYY-MM-DD");
                        } else {
                            const { from, to } = e;
                            if (from && to) {
                                fd = [from, to].map((d) =>
                                    formatDate(d, "YYYY-MM-DD"),
                                );

                                setOpen(false);
                            } else return;
                        }

                        column.setFilterValue(e);
                    }}
                    numberOfMonths={dateRange ? 2 : 1}
                />
            </PopoverContent>
        </Popover>
    );
}
const RangeText = typedMemo(({ date }) => {
    if (!date?.from || !date?.to) return null;
    return (
        <>
            <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                {formatDate(date.from, "YYYY-MM-DD")}
            </Badge>
            -
            <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                {formatDate(date.to, "YYYY-MM-DD")}
            </Badge>
        </>
    );
});
