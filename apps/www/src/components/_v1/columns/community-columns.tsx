import { getBadgeColor } from "@/lib/color";
import { ExtendedHome, IHomeStatus } from "@/types/community";
import { useEffect, useState } from "react";
import { Badge } from "@gnd/ui/badge";
import { cn } from "@/lib/utils";
import {
    calculateHomeInvoice,
    getHomeProductionStatus,
} from "@/lib/community/community-utils";
import { Cell, DateCellContent } from "./base-columns";
import Money from "../money";
import { Progress } from "@/components/(clean-code)/progress";
interface Props {
    home: ExtendedHome;
}
export function HomeProductionStatus({ home }: Props) {
    let [status, setStatus] = useState<IHomeStatus>({} as any);
    useEffect(() => {
        setStatus(getHomeProductionStatus(home));
    }, [home]);
    return (
        <div className="w-16">
            {/* {home.} */}
            <Badge
                variant={"secondary"}
                className={`h-5 px-1 whitespace-nowrap  text-xs text-slate-100 ${status.badgeColor}`}
            >
                {status.productionStatus}
            </Badge>
            <p>{status.prodDate}</p>
        </div>
    );
}
export function HomeStatus({ home }: Props) {
    let [status, setStatus] = useState<{ status; badgeColor }>({} as any);

    useEffect(() => {
        if (home.jobs?.length > 0)
            setStatus({
                status: "Installed",
                badgeColor: "bg-green-600 hover:bg-green-600",
            });
        else {
            const _hs = getHomeProductionStatus(home);
            setStatus({
                status: `Prod. ${_hs.productionStatus}`,
                badgeColor: _hs.badgeColor,
            });
        }
        // setStatus(getHomeProductionStatus(home));
    }, [home]);
    return (
        <div className="whitespace-nowrap">
            {/* <Badge
                variant={"secondary"}
                className={cn(
                    `h-5 px-1 whitespace-nowrap  text-xs text-slate-100`,
                    status.badgeColor,
                )}
            >
                {status.status}
            </Badge> */}
            <Progress>
                <Progress.Status>{status.status}</Progress.Status>
            </Progress>
        </div>
    );
}
export function HomeInstallationStatus({ home }: Props) {
    return (
        <div className="w-16">
            <Badge
                variant={"secondary"}
                className={cn(
                    `h-5 px-1 whitespace-nowrap  text-xs text-slate-100`,
                    home.jobs?.length > 0
                        ? "bg-green-600 hover:bg-green-600"
                        : "bg-pink-600 hover:bg-pink-600",
                )}
            >
                {home.jobs?.length} submitted
            </Badge>
        </div>
    );
}
export function HomeInvoiceColumn({ home }: Props) {
    const [invoice, setInvoice] = useState<{ paid; due; chargeBack }>(
        {} as any,
    );

    useEffect(() => {
        setInvoice(calculateHomeInvoice(home));
    }, [home]);
    return (
        <Cell>
            <div className="flex flex-col items-end">
                <Money className="text-orange-600" value={invoice.due} />
                <Money className="text-green-600" value={invoice.paid} />
                {invoice.chargeBack < 0 && (
                    <Money
                        className="text-red-600"
                        value={invoice.chargeBack}
                    />
                )}
            </div>
        </Cell>
    );
}
