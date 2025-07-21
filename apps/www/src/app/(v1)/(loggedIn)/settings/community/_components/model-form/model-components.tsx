import { useState } from "react";
import { _useId } from "@/hooks/use-id";
import { addSpacesToCamelCase, cn, dotArray } from "@/lib/utils";
import { HomeTemplateDesign } from "@/types/community";

import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";

import { ModelFormProps } from "./model-form";

interface ModelFormSectionProps<T> {
    section?;
    title?;
    rows(
        f: (ck: keyof T, cells?: CellSize, label?) => any,
        f2: (ck: keyof T, label?, cells?: CellSize) => any,
    );
    node: keyof HomeTemplateDesign;
}
export function ModelFormSection<T>({
    //   children,
    title,
    section,
    rows,
    form,
    node,
}: ModelFormSectionProps<T> & ModelFormProps) {
    const Ctx = ModelComponents<T>({ form, node });
    const print = form.watch("ctx.print");

    let _rows = rows(Ctx._field, Ctx._field2);
    if (print) {
        const nodeKeys = Object.keys(dotArray(form.getValues()));
        _rows = _rows
            ?.map((row) => {
                if (Array.isArray(row)) {
                    const fr = row
                        .map((cell) => {
                            if (!nodeKeys.includes(`${node}.${cell.ck}`))
                                return null;
                            return row;
                        })
                        .filter(Boolean);
                    if (fr?.length == 0) return null;
                    return row;
                }
                if (!nodeKeys.includes(`${node}.${row.ck}`)) return null;
                return row;
            })
            .filter(Boolean);
    }
    return (
        <table className="w-full table-fixed overflow-x-hidden">
            <thead className="">
                {section && (
                    <tr className="border">
                        <th colSpan={12} className="bg-slate-200 text-center">
                            {section}
                        </th>
                    </tr>
                )}
                {title && _rows.length ? (
                    <tr className="border">
                        <th
                            colSpan={12}
                            className="bg-slate-100 p-0.5 px-4 text-left"
                        >
                            {title}
                        </th>
                    </tr>
                ) : (
                    <></>
                )}
            </thead>
            {!_rows.length ? (
                <></>
            ) : (
                <tbody>
                    {_rows?.map((row, i) => (
                        <tr key={`${_useId()}`}>
                            {Array.isArray(row) ? (
                                row.map((cell, i) => (
                                    <Ctx.Field key={`${_useId()}`} {...cell} />
                                ))
                            ) : (
                                <Ctx.Field key={`${_useId()}`} {...row} />
                            )}
                        </tr>
                    ))}
                </tbody>
            )}
        </table>
    );
}

export function ModelComponents<T>({
    form,
    node,
}: ModelFormProps & { node: keyof HomeTemplateDesign }) {
    // const {
    //     data: { community },
    // } = useDataPage();
    // const suggestions = useAppSelector((s) => s.slicers.templateFormSuggestion);
    const Field = ({
        label,
        cells = [2, 10],
        ck,
    }: {
        label: string;
        cells?: number[];
        ck: keyof T;
    }) => {
        const [open, setOpen] = useState(false);
        let formKey = `${node}.${ck as string}`;
        // let checked = community ? form.watch(`${formKey}.c` as any) : false;

        const print = form.watch("ctx.print");
        // const value = print ? form.watch(formKey as any) : null;
        // if (community && !print) formKey = `${formKey}.v`;
        return (
            <>
                <td align="right" colSpan={cells[0]}>
                    <div className="inline-flex space-x-2">
                        {/* {community && !print && (
                            <Checkbox
                                checked={checked}
                                onCheckedChange={e => {
                                    form.setValue(
                                        `${node}.${ck as string}.c` as any,
                                        e
                                    );
                                }}
                            />
                        )} */}
                        <Label
                            className={cn(
                                "mr-2 capitalize",
                                print && "font-semibold",
                            )}
                        >
                            {label}
                            {print ? ":" : ""}
                        </Label>
                    </div>
                </td>
                <td colSpan={cells[1]}>
                    <div className="relative w-full">
                        {print ? (
                            <span className="uppercase">
                                {form.getValues(formKey as any)}
                            </span>
                        ) : (
                            <Input
                                className="h-7 w-full uppercase"
                                {...form.register(formKey as any)}
                            />
                            // <AutoComplete
                            //     value={value}
                            //     form={form}
                            //     uppercase
                            //     allowCreate
                            //     formKey={formKey}
                            //     options={(suggestions?.[formKey] || []) as any}
                            // />
                        )}
                    </div>
                </td>
            </>
        );
    };
    function _field(ck: keyof T, cells: CellSize = "2,10", label?) {
        return {
            ck,
            label: label || addSpacesToCamelCase(ck),
            cells: cells.split(",").map((c) => Number(c)),
        };
    }
    return {
        Field,
        _field2(ck: keyof T, label?, cells: CellSize = "2,1") {
            return _field(ck, cells, label);
        },
        _field,
    };
}
type CellSize = "2,10" | "2,4" | "2,1" | "2,6";
