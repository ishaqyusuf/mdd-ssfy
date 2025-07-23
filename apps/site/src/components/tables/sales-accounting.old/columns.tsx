import { GetSalesCustomerTx } from "@/actions/get-customer-tx-action";
import TextWithTooltip from "@/components/(clean-code)/custom/text-with-tooltip";
import { TCell } from "@/components/(clean-code)/data-table/table-cells";
import { Progress } from "@/components/(clean-code)/progress";
import { formatMoney } from "@/lib/use-number";
import { cn } from "@/lib/utils";

export interface ItemProps {
    item: GetSalesCustomerTx["data"][number];
}

export function DateCell({ item }: ItemProps) {
    return (
        <TCell>
            <TCell.Date>{item.createdAt}</TCell.Date>
        </TCell>
    );
}
export function AmountPaidCell({ item }: ItemProps) {
    const money = formatMoney(Math.abs(item.amount));
    return (
        <TCell align="right">
            <TCell.Secondary
                className={cn(
                    "font-mono text-sm",
                    item.amount < 0 && "text-red-700/70",
                )}
            >
                {item.amount <= 0 ? `($${money})` : `$${money}`}
            </TCell.Secondary>
        </TCell>
    );
}
export function DescriptionCell({ item }: ItemProps) {
    return (
        <TCell>
            <TCell.Secondary className="whitespace-nowrap uppercase">
                <TextWithTooltip
                    className="max-w-[150px] xl:max-w-[250px]"
                    text={item.description}
                />
            </TCell.Secondary>
            <Progress>
                <Progress.Status>{item.paymentMethod}</Progress.Status>
            </Progress>
        </TCell>
    );
}
export function OrderIdCell({ item }: ItemProps) {
    return (
        <TCell>
            <TCell.Secondary>
                <TextWithTooltip
                    className="max-w-[100px] xl:max-w-[200px]"
                    text={item.orderIds || "-"}
                />
            </TCell.Secondary>
        </TCell>
    );
}
export function SalesRepCell({ item }: ItemProps) {
    return (
        <TCell>
            {item.salesReps.map((rep, repId) => (
                <TCell.Secondary key={repId}>{rep}</TCell.Secondary>
            ))}
        </TCell>
    );
}
export function PaymentAuthorCell({ item }: ItemProps) {
    return (
        <TCell>
            <TCell.Secondary>{item.authorName}</TCell.Secondary>
        </TCell>
    );
}
export function StatusCell({ item }: ItemProps) {
    return (
        <TCell>
            <Progress>
                <Progress.Status>{item.status}</Progress.Status>
            </Progress>
        </TCell>
    );
}
export function ActionCell({ item }: ItemProps) {
    return <TCell></TCell>;
}
