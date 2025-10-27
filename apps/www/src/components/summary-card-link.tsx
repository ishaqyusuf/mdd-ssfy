import { useMemo } from "react";
import { _path, _pathIs } from "./static-trpc";
import { InventorySummary, SummaryProps } from "./inventory-summary";
import Link from "next/link";
import { cn } from "@gnd/ui/cn";
interface Props {
    path: string;
    summaryProps: SummaryProps;
}

export function SummaryCardLink(props: Props) {
    const isSelected = useMemo(() => _pathIs(props.path), [_path]);

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

