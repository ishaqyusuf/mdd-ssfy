import { BadgeProps, Badge as BaseBadge } from "@gnd/ui/badge";

interface Props {
    value?;
    prefix?;
    suffix?;
    alwayShow?: boolean;
    variant?: BadgeProps["variant"];
}
export default function Badge({
    value,
    variant = "default",
    alwayShow,
    prefix,
    suffix,
}: Props) {
    if (!value && !alwayShow) return null;
    return (
        <BaseBadge variant={variant} className="font-mono">
            {prefix} {value} {suffix}
        </BaseBadge>
    );
}
