import { useState } from "react";
import { cn } from "@/lib/utils";
import { NumericFormat, type NumericFormatProps } from "react-number-format";

import { Input } from "./ui/input";

export function CurrencyInput({
    thousandSeparator = true,
    ...props
}: NumericFormatProps) {
    return (
        <NumericFormat
            thousandSeparator={thousandSeparator}
            customInput={Input}
            {...props}
        />
    );
}

export function NumberInput({
    thousandSeparator = true,
    value,
    className,
    noMask,
    // onValueChange,
    ...props
}: NumericFormatProps & {
    noMask?: boolean;
}) {
    // props.value
    const [isFocused, setIsFocused] = useState(false);
    const isPlaceholder = !value && !isFocused && !noMask && !props.placeholder;
    return (
        <div className="midday  relative font-mono">
            <CurrencyInput
                // suffix="%)"
                // prefix="$"
                autoComplete="off"
                value={value}
                onFocus={() => setIsFocused(true)}
                onBlur={() => {
                    setIsFocused(false);
                    // onBlur();
                }}
                // className="p-0 border-0 h-6 text-xs !bg-transparent font-mono flex-shrink-0 w-16 text-[11px] text-[#878787]"
                thousandSeparator={thousandSeparator}
                decimalScale={2}
                // isAllowed={(values) => {
                //     const { floatValue } = values;
                //     return (
                //         floatValue === undefined ||
                //         (floatValue >= 0 && floatValue <= 100)
                //     );
                // }}
                className={cn(
                    // className,
                    isPlaceholder && "opacity-0",
                    "border-transparents h-6 border-0 border-b !bg-transparent p-0 text-xs focus:border-border",
                    className,
                )}
                allowNegative={false}
                {...props}
            />
            {isPlaceholder && (
                <div className="pointer-events-none absolute inset-0">
                    <div className="h-full w-full bg-[repeating-linear-gradient(-60deg,#DBDBDB,#DBDBDB_1px,transparent_1px,transparent_5px)] dark:bg-[repeating-linear-gradient(-60deg,#2C2C2C,#2C2C2C_1px,transparent_1px,transparent_5px)]" />
                </div>
            )}
        </div>
    );
}
