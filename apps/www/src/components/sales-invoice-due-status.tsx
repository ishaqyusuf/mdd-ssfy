import Money from "./_v1/money";
import { cn } from "@/lib/utils";
import dayjs from "dayjs";
import { TCell } from "./(clean-code)/data-table/table-cells";

export function SalesInvoiceDueStatus({ amountDue, dueDate, className = "" }) {
    const dayDiff = dueDate ? dayjs().diff(dueDate, "D") : null;
    return (
        <span
            className={cn(
                amountDue && "text-orange-700",
                dayDiff < 0 && "text-red-400"
            )}
        >
            <Money value={amountDue} />
            <span>{dueDate && <TCell.Date>{dueDate}</TCell.Date>}</span>
        </span>
    );
}
