import { IconKeys, Icons } from "@/components/_v1/icons";
import { cn } from "@/lib/utils";
import { cva, VariantProps } from "class-variance-authority";

interface Props
    extends React.HTMLAttributes<HTMLDivElement>,
        VariantProps<typeof variants> {
    label?: string;
    value?;
    children?;
}
const variants = cva("flex  border-b text-sm justify-between items-center", {
    variants: {
        layout: {
            flex: "flex py-2 border-b",
            col: "flex-col",
        },
        size: {
            sm: "gap-2 py-1 px-2",
            default: "gap-4 py-2 px-4 sm:px-8",
        },
    },
    defaultVariants: {
        layout: "flex",
        size: "default",
    },
});
function DlBase({
    label,
    value,
    children,
    className,
    ...props
}: Props & VariantProps<typeof variants>) {
    return (
        <div className={cn(variants(props), className)}>
            <dt className="text-muted-foreground">{label}</dt>
            <dt className="">{value}</dt>
        </div>
    );
}
function Icon({
    label,
    value,
    children,
    icon,
    className,
    ...props
}: Props & VariantProps<typeof variants> & { icon: IconKeys }) {
    const Ico = Icons[icon];
    return (
        <div
            className={cn(
                "flex gap-4 py-2 border-b text-sm  items-center",
                value && label && "justify-between",
                variants(props)
            )}
        >
            <div className="flex gap-4">
                <Ico className="size-4" />
                <dt className="text-muted-foreground">{label}</dt>
            </div>
            <dt className="">{value}</dt>
        </div>
    );
}
export const DataLine = Object.assign(DlBase, {
    Icon,
});
