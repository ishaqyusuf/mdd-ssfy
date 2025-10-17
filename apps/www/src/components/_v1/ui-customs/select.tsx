"use client";

import { Label } from "@gnd/ui/label";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@gnd/ui/select";

interface Props<T> {
    label?;
    form?;
    value?;
    setValue?;
    formKey?;
    options?: T[];
    labelKey?: keyof T;
    valueKey?: keyof T;
    transformValue?;
    OptionItem?;
}
export default function SelectInput<T>({
    label,
    form,
    value,
    setValue,
    formKey,
    options,
    labelKey = "label" as any,
    valueKey = "id" as any,
    transformValue,
    OptionItem,
}: Props<T>) {
    const _value = form && formKey ? form.watch(formKey) : value;

    return (
        <div className="grid gap-2">
            {label && <Label>{label}</Label>}
            <Select
                onValueChange={(value) => {
                    let _v = transformValue ? transformValue(value) : value;
                    if (form) form.setValue(formKey, _v);
                    if (setValue) setValue(_v);
                }}
                value={`${_value}`}
            >
                <SelectTrigger className="h-8">
                    <SelectValue placeholder="" />
                </SelectTrigger>
                <SelectContent>
                    <SelectGroup>
                        {options?.map((o, _) => (
                            <SelectItem
                                key={_}
                                value={`${
                                    typeof o == "string" ? o : o[valueKey]
                                }`}
                            >
                                {OptionItem ? (
                                    <OptionItem option={o} />
                                ) : typeof o == "string" ? (
                                    o
                                ) : (
                                    (o[labelKey] as any)
                                )}
                            </SelectItem>
                        ))}
                    </SelectGroup>
                </SelectContent>
            </Select>
        </div>
    );
}
