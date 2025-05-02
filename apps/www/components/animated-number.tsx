"use client";

// import { useUserContext } from "@/store/user/hook";
import NumberFlow from "@number-flow/react";

type Props = {
    value: number;
    currency?: "USD" | "number";
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    locale?: string;
};

export function AnimatedNumber({
    value,
    currency,
    minimumFractionDigits,
    maximumFractionDigits,
    locale,
}: Props) {
    //   const user = useUserContext((state) => state.data);
    const localeToUse = locale; // || user?.locale;

    return (
        <NumberFlow
            value={value}
            format={
                currency == "number"
                    ? undefined
                    : {
                          style: "currency",
                          currency: currency ?? "USD",
                          minimumFractionDigits,
                          maximumFractionDigits,
                      }
            }
            willChange
            locales={localeToUse}
        />
    );
}
