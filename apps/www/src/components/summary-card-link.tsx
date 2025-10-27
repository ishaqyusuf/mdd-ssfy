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
    const isSelected = useMemo(() => _pathIs("/community"), [_path]);

    return (
        <Link
            href={props.path}
            type="button"
            onClick={(e) => {}}
            className={cn("hidden sm:block text-left")}
        >
            <InventorySummary selected={isSelected} {...props.summaryProps} />
        </Link>
    );
}

