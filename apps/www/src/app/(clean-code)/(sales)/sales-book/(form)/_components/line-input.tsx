import { NumberInput } from "@/components/currency-input";
import { cn } from "@/lib/utils";
import { FieldPath } from "react-hook-form";

import { Input, InputProps } from "@gnd/ui/input";
import { Switch } from "@gnd/ui/switch";

import { ZusGroupItemFormPath } from "../_common/_stores/form-data-store";
import { GroupFormClass } from "../_utils/helpers/zus/group-form-class";
import { NumericFormatProps } from "react-number-format";
import { QtyInputProps, QuantityInput } from "@gnd/ui/quantity-input";
import { useState } from "react";

interface LineInputProps {
    lineUid;
    name: FieldPath<ZusGroupItemFormPath>;
    cls: GroupFormClass;
    valueChanged?;
    numberProps?: NumericFormatProps;
    qtyInputProps?: QtyInputProps;
    allowZero?: boolean;
    mask?: boolean;
}
export function LineInput({
    lineUid,
    name,
    cls,
    valueChanged,
    allowZero,
    numberProps = {},
    qtyInputProps,
    mask,
    ...props
}: LineInputProps & InputProps) {
    const value = cls.dotGetGroupItemFormValue(lineUid, name);

    const [isFocused, setIsFocused] = useState(false);
    const onValueChange = (v) => {
        console.log({ v });
        let value = allowZero ? (v == undefined ? null : v) : v || null;
        cls.dotUpdateGroupItemFormPath(lineUid, name, value);
        valueChanged?.(value);
    };
    if (qtyInputProps)
        return (
            <div className="relative">
                <QuantityInput
                    onChange={onValueChange}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => {
                        setIsFocused(false);
                        // field.onBlur();
                    }}
                    value={value}
                    className={cn()}
                    {...qtyInputProps}
                />
                {mask && !value && (
                    <div className="absolute inset-0 pointer-events-none">
                        <div className="h-full w-full bg-[repeating-linear-gradient(-60deg,#DBDBDB,#DBDBDB_1px,transparent_1px,transparent_5px)] dark:bg-[repeating-linear-gradient(-60deg,#2C2C2C,#2C2C2C_1px,transparent_1px,transparent_5px)]" />
                    </div>
                )}
            </div>
        );
    if (props.type == "number")
        return (
            <NumberInput
                className={cn(props.className)}
                value={value}
                onValueChange={(e) => onValueChange(e.floatValue)}
                {...numberProps}
            />
        );
    return (
        <Input
            className="h-8 uppercase"
            {...props}
            defaultValue={value as any}
            onChange={(e) => {
                const val =
                    props.type == "number"
                        ? e.target.value === ""
                            ? null
                            : +e.target.value
                        : e.target.value;

                cls.dotUpdateGroupItemFormPath(lineUid, name, val);
                valueChanged?.(val);
            }}
        />
    );
}
export function LineSwitch({
    lineUid,
    name,
    cls,
    valueChanged,
}: LineInputProps) {
    const value = cls.dotGetGroupItemFormValue(lineUid, name);

    return (
        <>
            <Switch
                defaultChecked={value as any}
                onCheckedChange={(e) => {
                    cls.dotUpdateGroupItemFormPath(lineUid, name, e);
                    valueChanged?.(e);
                }}
            />
        </>
    );
}
