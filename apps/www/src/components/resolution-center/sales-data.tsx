import { getSalesResolutionData } from "@/actions/get-sales-resolution-data";
import { Badge } from "@gnd/ui/badge";
import { Card, CardContent } from "@gnd/ui/card";
import { Label } from "@gnd/ui/label";
import { useAsyncMemo } from "use-async-memo";
import { Item } from "./resolution-center-content";
import Money from "../_v1/money";
import { DataSkeletonProvider } from "@/hooks/use-data-skeleton";
import { skeletonListData } from "@/utils/format";
import { Icon, PaymentMethodIcon, StatusIcon } from "@gnd/ui/custom/icons";
import { formatDate } from "@/lib/use-day";
import { ResolutionDialog } from "./resolution-dialog";
import { DataSkeleton } from "../data-skeleton";
import { timeout } from "@/lib/timeout";
import { Progress } from "../(clean-code)/progress";
import { useResolutionCenterParams } from "@/hooks/use-resolution-center-params";

export function SalesData({ sale }: { sale: Item }) {
    const r = useResolutionCenterParams();
    const data = useAsyncMemo(async () => {
        await timeout(300);
        const r = await getSalesResolutionData(sale?.id);
        return r;
    }, [sale?.id, r.params?.refreshToken]);
    return (
        <CardContent className="pt-0">
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
                    <div>
                        <Label className="text-xs text-muted-foreground">
                            Grand Total
                        </Label>
                        <div className="text-lg font-semibold">
                            <Money value={sale?.total} />
                        </div>
                    </div>
                    <div>
                        <Label className="text-xs text-muted-foreground">
                            Amount Paid
                        </Label>
                        <div className="text-lg font-semibold text-green-600">
                            <Money value={sale?.paid} />
                        </div>
                    </div>
                    <div>
                        <Label className="text-xs text-muted-foreground">
                            Amount Due
                        </Label>
                        <div
                            className={`text-lg font-semibold ${sale.due > 0 ? "text-red-600" : "text-green-600"}`}
                        >
                            ${sale.due.toLocaleString()}
                        </div>
                    </div>
                </div>
                <div>
                    <h4 className="font-semibold mb-3">Payment History</h4>
                    <DataSkeletonProvider
                        value={
                            {
                                loading: !data?.salesId,
                            } as any
                        }
                    >
                        <div className="space-y-3">
                            {skeletonListData(data?.payments, 3, {
                                history: [{} as any],
                            }).map((payment, i) => (
                                <Card key={i} className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-2">
                                                <Icon
                                                    name={
                                                        (payment.paymentMethod ||
                                                            "cash") as any
                                                    }
                                                    className=""
                                                />

                                                <span className="font-medium capitalize">
                                                    <DataSkeleton
                                                        as="span"
                                                        pok="textSm"
                                                    >
                                                        {payment.paymentMethod?.replace(
                                                            "-",
                                                            " ",
                                                        )}
                                                    </DataSkeleton>
                                                </span>
                                                {(payment.checkNo ||
                                                    !data?.salesId) && (
                                                    <DataSkeleton
                                                        as="span"
                                                        pok="textSm"
                                                    >
                                                        <span className="text-sm text-muted-foreground">
                                                            #{payment.checkNo}
                                                        </span>
                                                    </DataSkeleton>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <StatusIcon
                                                    status={payment.status}
                                                />
                                                <DataSkeleton
                                                    as="span"
                                                    pok="textSm"
                                                >
                                                    <Progress>
                                                        <Progress.Status>
                                                            {payment.status}
                                                        </Progress.Status>
                                                    </Progress>
                                                </DataSkeleton>
                                                <span className="mr-4 uppercase text-xs font-semibold">
                                                    {payment?.reason}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <div className="font-semibold">
                                                    <Money
                                                        value={payment?.amount}
                                                    />
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {formatDate(
                                                        payment?.createdAt,
                                                    )}{" "}
                                                    • {payment.authorName}
                                                </div>
                                            </div>
                                            <DataSkeleton pok="textLg">
                                                <ResolutionDialog
                                                    payment={payment}
                                                    refundableAmount={
                                                        sale?.due < 0
                                                            ? Math.min(
                                                                  sale.due * -1,
                                                                  payment.amount,
                                                              )
                                                            : 0
                                                    }
                                                    // onResolve={(action, reason, note) =>
                                                    //     handleResolve(
                                                    //         sale.id,
                                                    //         payment.id,
                                                    //         action,
                                                    //         reason,
                                                    //         note,
                                                    //     )
                                                    // }
                                                />
                                            </DataSkeleton>
                                        </div>
                                    </div>
                                    <div>
                                        <span>
                                            {payment?.history?.[0]?.description}
                                        </span>
                                    </div>
                                    {payment.history.length > 0 && (
                                        <div className="mt-3 pt-3 border-t">
                                            <Label className="text-xs text-muted-foreground">
                                                History
                                            </Label>
                                            <div className="mt-1 space-y-1">
                                                {payment.history.map(
                                                    (entry, index) => (
                                                        <div
                                                            key={index}
                                                            className="text-xs text-muted-foreground flex items-center gap-2"
                                                        >
                                                            <StatusIcon
                                                                status={
                                                                    entry.status
                                                                }
                                                            />
                                                            <span>
                                                                <DataSkeleton pok="textSm">
                                                                    {formatDate(
                                                                        entry.createdAt,
                                                                    )}
                                                                </DataSkeleton>
                                                            </span>
                                                            <span>•</span>
                                                            <span className="capitalize">
                                                                <DataSkeleton pok="textSm">
                                                                    {
                                                                        entry.status
                                                                    }
                                                                </DataSkeleton>
                                                            </span>
                                                            <span>•</span>
                                                            <span className="uppercase">
                                                                <DataSkeleton pok="textSm">
                                                                    {entry.reason
                                                                        ?.split(
                                                                            "-",
                                                                        )
                                                                        ?.join(
                                                                            " ",
                                                                        )}
                                                                </DataSkeleton>
                                                            </span>
                                                            {(entry.authorName ||
                                                                !data?.salesId) && (
                                                                <>
                                                                    <span>
                                                                        •
                                                                    </span>
                                                                    <span>
                                                                        by{" "}
                                                                        <DataSkeleton
                                                                            as={
                                                                                "span"
                                                                            }
                                                                            pok="textSm"
                                                                        >
                                                                            {
                                                                                entry.authorName
                                                                            }
                                                                        </DataSkeleton>
                                                                    </span>
                                                                </>
                                                            )}
                                                            {(entry.description ||
                                                                !data?.salesId) && (
                                                                <>
                                                                    <span>
                                                                        •
                                                                    </span>
                                                                    <span>
                                                                        <DataSkeleton pok="textSm">
                                                                            {
                                                                                entry.description
                                                                            }
                                                                        </DataSkeleton>
                                                                    </span>
                                                                </>
                                                            )}
                                                        </div>
                                                    ),
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </Card>
                            ))}
                        </div>
                    </DataSkeletonProvider>
                </div>
            </div>
        </CardContent>
    );
}
