import { Fragment, useEffect, useState } from "react";
import Link from "@/components/link";
import { DataTableFacetedFilter2 } from "@/components/_v1/data-table/data-table-faceted-filter-2";
import { IconKeys, Icons } from "@/components/_v1/icons";
import Portal from "@/components/_v1/portal";
import { timeout } from "@/lib/timeout";
import useEffectLoader from "@/lib/use-effect-loader";
import { cn, randomNumber2 } from "@/lib/utils";

import { Button, ButtonProps } from "@gnd/ui/button";
import { Input } from "@gnd/ui/input";

import { useDataTableContext } from "./use-data-table";

interface Props {
    children?;
}
function BaseTableToolbar({ children }: Props) {
    const { table, columns } = useDataTableContext();
    const isFiltered = table.getState().columnFilters.length > 0;
    return (
        <div className="flex w-full items-center space-x-2 overflow-auto p-1">
            <div className="flex flex-wrap items-center gap-2">
                {children}
                {isFiltered && (
                    <Button
                        aria-label="Reset filters"
                        variant="ghost"
                        className="h-8 px-2 lg:px-3"
                        onClick={() => table.resetColumnFilters()}
                    >
                        Reset
                        <Icons.X className="ml-2 h-4 w-4" />
                    </Button>
                )}
            </div>
            <div className="flex-1"></div>
            <div className={cn("flex gap-2")} id="actionBtns"></div>
            <div className={cn("flex gap-2")} id="batchActionBtns"></div>
        </div>
    );
}
interface SearchProps {
    k?: string;
    placeholder?: string;
}
function Search({ k = "_q", placeholder }: SearchProps) {
    const { table, columns } = useDataTableContext();
    const col = table.getColumn(String(k));
    return (
        <Input
            placeholder={`Filter ${placeholder || ""}...`}
            value={(col?.getFilterValue() as string) ?? ""}
            onChange={(event) => col?.setFilterValue(event.target.value)}
            className="h-8 w-[150px] lg:w-[250px]"
        />
    );
}
// interface FilterProps<T> {
//     multiSelect?: boolean;
//     title?: string;
//     id: string;
//     options?: (T | {label?:string, value?: string})[];
//     optionKey?: keyof T | keyof Awaited<ReturnType<T>>[number];
//     optionValue?: keyof T | keyof Awaited<ReturnType<T>>[number];
//     optionFn?: T; //async function that returns list of options example async function() { return await .... }
// }
// function Filter<T>({
//     optionKey = 'label',
//     optionValue = 'value',

// }:FilterProps<T>) {
//     return <></>
// }
interface FilterProps<T> {
    multiSelect?: boolean;
    title?: string;
    id: string;
    options?: (T | { label?: string; value?: string } | string)[];
    labelKey?: keyof T;
    labelKeyFn?: (item: T) => string;
    valueKey?: keyof T;
    valueKeyFn?: (item: T) => string;
    optionFn?: () => Promise<T[]>; // Async function that returns a list of options
}

function Filter<T>({
    labelKey = "label" as keyof T,
    valueKey = "value" as keyof T,
    id,
    optionFn,
    options,
    valueKeyFn,
    labelKeyFn,
    ...props
}: FilterProps<T>) {
    const { table, columns, addFilterCol } = useDataTableContext();
    const [loadedOptions, setLoadedOptions] = useState([]);
    const [column, setColumn] = useState(null);
    useEffect(() => {
        const col = table.getColumn(String(id));
        if (col) setColumn(col);
        else {
            addFilterCol(id);
            return null;
        }
        if (optionFn)
            (async () => {
                const w = randomNumber2(500, 1500);

                await timeout(w as any);
                const resp = await optionFn();

                setLoadedOptions(resp);
            })();
    }, []);
    if (!column) return null;
    const _options = () => (optionFn ? loadedOptions : options || []) as T[];
    return (
        <>
            <DataTableFacetedFilter2
                key={String(column.id)}
                single={!props.multiSelect}
                column={column}
                title={props.title}
                options={_options()?.map((opt) =>
                    typeof opt === "string"
                        ? { label: opt, value: opt }
                        : {
                              label: labelKeyFn
                                  ? labelKeyFn(opt)
                                  : opt[labelKey],
                              value: valueKeyFn
                                  ? valueKeyFn(opt)
                                  : opt[valueKey],
                          },
                )}
            />
        </>
    );
}
interface ActionBtnProps {
    variant?: ButtonProps["variant"];
    icon?: IconKeys;
    onClick?;
    href?: string;
    size?: ButtonProps["size"];
    label?: string;
}
function ActionBtn({ size = "sm", ...props }: ActionBtnProps) {
    const Icon = props.icon ? Icons[props.icon] : null;

    const Content = ({}) => (
        <>
            {Icon && (
                <Icon className={cn("size-4", props.label ? "mr-2" : "")} />
            )}
            {props.label}
        </>
    );
    return (
        <Portal nodeId={"actionBtns"}>
            <Button
                asChild={props.href ? true : false}
                className={cn(size == "sm" && "h-8")}
                size={size}
                variant={props.variant}
                onClick={!props.href && props.onClick}
            >
                {props.href ? (
                    <Link href={props.href}>
                        <Content />
                    </Link>
                ) : (
                    <Content />
                )}
            </Button>
        </Portal>
    );
}
export let TableToolbar = Object.assign(BaseTableToolbar, {
    Search,
    Filter,
    ActionBtn,
});
