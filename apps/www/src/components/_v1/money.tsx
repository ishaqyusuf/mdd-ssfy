import { cn, formatCurrency } from "@/lib/utils";

interface Props {
    value;
    validOnly?: Boolean;
    className?: string;
    noCurrency?: boolean;
}
export default function Money({
    value,
    validOnly,
    className,
    noCurrency,
}: Props) {
    if (!value) value = 0;
    if (!value && validOnly) return null;
    return (
        <span className={cn(className)}>
            {noCurrency
                ? new Intl.NumberFormat("en-US", {
                      minimumFractionDigits: 2,
                  }).format(value)
                : formatCurrency.format(value)}
        </span>
    );
}
