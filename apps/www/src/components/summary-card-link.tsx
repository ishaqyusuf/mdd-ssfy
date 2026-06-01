import { InventorySummary, SummaryProps } from "./inventory-summary";
import Link from "next/link";
import { cn } from "@gnd/ui/cn";
import { usePathname } from "next/navigation";
interface Props {
    path: string;
    summaryProps: SummaryProps;
}

export function SummaryCardLink(props: Props) {
    const pathname = usePathname();
    const normalizedPath = `/${props.path.split("/").filter(Boolean).join("/")}`;
    const isSelected = pathname === normalizedPath;

    return (
        <Link
            href={props.path}
            type="button"
            onClick={(e) => {}}
            className={cn(
                "hidden sm:block text-left",
                !isSelected && "hover:bg-secondary"
            )}
        >
            <InventorySummary
                selectable
                selected={isSelected}
                {...props.summaryProps}
            />
        </Link>
    );
}
