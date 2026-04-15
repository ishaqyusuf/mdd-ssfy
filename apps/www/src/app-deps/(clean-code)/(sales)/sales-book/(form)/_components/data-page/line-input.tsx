import { useMemo } from "react";
import { dotObject } from "@/app/(clean-code)/_common/utils/utils";
import { SalesFormZusData } from "@/app/(clean-code)/(sales)/types";
import { FormSelectProps } from "@/components/common/controls/form-select";
import { NumberInput } from "@/components/currency-input";
import { LabelInput } from "@/components/label-input";
import { cn } from "@/lib/utils";
import { FieldPath, FieldPathValue } from "react-hook-form";

import { Input as BaseInput, InputProps } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";
import { ScrollArea } from "@gnd/ui/scroll-area";
import {
    Select as BaseSelect,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@gnd/ui/select";
import { Switch } from "@gnd/ui/switch";

import { useFormDataStore } from "../../_common/_stores/form-data-store";

interface LineInputProps {
    name: FieldPath<SalesFormZusData>;
    label?: string;
    onChange?;
    midday?: boolean;
    currency?: boolean;
}
function getValue<K extends FieldPath<SalesFormZusData>>(
    path: K,
    state: SalesFormZusData,
): FieldPathValue<SalesFormZusData, K> {
    return dotObject.pick(path, state);
}
export function Input({
    name,
    label,
    onChange,
    midday,
    currency,
    ...props
}: LineInputProps & InputProps) {
    const state = useFormDataStore();

    const value = useMemo(() => {
        const value = getValue(name, state);
        return value || "";
    }, [state]);

    return (
        <div
            className={cn(
                label && "grid gap-2",
                midday && "flex grid-cols-2 items-center   space-x-2 uppercase",
            )}
        >
            {label && (
                <Label
                    className={cn(
                        props.disabled && "text-muted-foreground",
                        midday && "text-xss font-mono$",
                    )}
                >
                    {label}:
                </Label>
            )}
            {midday ? (
                <>
                    {currency ? (
                        <NumberInput
                            prefix="$"
                            className="w-16"
                            value={value as any}
                            onValueChange={(e) => {
                                const val = e.floatValue || null;
                                state.dotUpdate(name, val);
                                onChange?.(val);
                            }}
                        />
                    ) : (
                        <LabelInput
                            className="midday w-28"
                            value={value as any}
                            onChange={(e) => {
                                const val =
                                    props.type == "number"
                                        ? +e.target.value
                                        : e.target.value;
                                state.dotUpdate(name, val);
                                onChange?.(val);
                            }}
                        />
                    )}
                </>
            ) : (
                <BaseInput
                    {...props}
                    className={cn("h-8", props.className)}
                    value={value as any}
                    onChange={(e) => {
                        const val =
                            props.type == "number"
                                ? +e.target.value
                                : e.target.value;
                        state.dotUpdate(name, val);
                        onChange?.(val);
                    }}
                />
            )}
        </div>
    );
}
export function Select<T>({
    name,
    options,
    valueKey,
    titleKey,
    Item,
    SelectItem: SelItem,
    label,
    midday,
    ...props
}: LineInputProps & FormSelectProps<T>) {
    const state = useFormDataStore();
    const value = getValue(name, state);
    function itemValue(option) {
        if (!option) return option;
        if (Number.isInteger(option)) option = String(option);

        return typeof option == "object" ? option[valueKey] : option;
    }
    function itemText(option) {
        if (!option) return option;
        return typeof option == "string"
            ? option
            : titleKey == "label"
              ? option[titleKey] || option["text"]
              : option[titleKey];
    }
    const isPlaceholder = !value;
    return (
        <div
            className={cn(
                label && "grid gap-2",
                midday && "flex items-center  uppercase",
            )}
        >
            {label && (
                <Label
                    className={cn(
                        midday && "text-xss whitespace-nowrap font-mono$ ",
                    )}
                >
                    {label}:
                </Label>
            )}
            <BaseSelect
                onValueChange={(e) => {
                    state.dotUpdate(name, e);
                    props.onSelect?.(e as any);
                }}
                value={value}
            >
                {midday ? (
                    <SelectTrigger
                        noIcon
                        className="uppercases midday relative  h-7 w-auto min-w-[16px] border-none bg-transparent p-0 font-mono$"
                    >
                        {isPlaceholder && (
                            <div className="pointer-events-none absolute inset-0">
                                <div className="h-full w-full bg-[repeating-linear-gradient(-60deg,#DBDBDB,#DBDBDB_1px,transparent_1px,transparent_5px)] dark:bg-[repeating-linear-gradient(-60deg,#2C2C2C,#2C2C2C_1px,transparent_1px,transparent_5px)]" />
                            </div>
                        )}

                        <SelectValue
                            asChild
                            className="whitespace-nowrap border-none p-0 font-mono$ uppercase"
                            // placeholder={props.placeholder}
                        >
                            <span>
                                {itemText(
                                    options?.find((o) => itemValue(o) == value),
                                )}
                            </span>
                        </SelectValue>
                    </SelectTrigger>
                ) : (
                    <SelectTrigger className={cn("h-8")}>
                        <div className="inline-flex gap-1">
                            <SelectValue
                                className="whitespace-nowrap"
                                placeholder={props.placeholder}
                            ></SelectValue>
                        </div>
                    </SelectTrigger>
                )}
                <SelectContent className="">
                    <ScrollArea className="max-h-[40vh] overflow-auto">
                        {options?.map((option, index) =>
                            SelItem ? (
                                <SelItem option={option} key={index} />
                            ) : (
                                <SelectItem
                                    key={index}
                                    value={itemValue(option)}
                                >
                                    {Item ? (
                                        <Item option={option} />
                                    ) : (
                                        <>{itemText(option)}</>
                                    )}
                                </SelectItem>
                            ),
                        )}
                    </ScrollArea>
                </SelectContent>
            </BaseSelect>
        </div>
    );
}
export function LineSwitch({ name }: LineInputProps) {
    const state = useFormDataStore();
    const value = getValue(name, state);

    return (
        <>
            <Switch
                defaultChecked={value as any}
                onCheckedChange={(e) => {
                    state.dotUpdate(name, e);
                }}
            />
        </>
    );
}
