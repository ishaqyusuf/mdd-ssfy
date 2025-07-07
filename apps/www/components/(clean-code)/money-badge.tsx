import { formatMoney } from "@/lib/use-number";
import { cva } from "class-variance-authority";
import { Badge, BadgeProps } from "@gnd/ui/badge";

const moneyBadgeVariants = cva("", {
    variants: {},
});
interface Props {
    children?;
    variant?: BadgeProps["variant"];
}
export function MoneyBadge({ children, variant }: Props) {
    return (
        <Badge variant={variant} className="h-5 px-1">
            ${formatMoney(children)}
        </Badge>
    );
}
