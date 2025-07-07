import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { Skeleton } from "@gnd/ui/skeleton";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { AnimatedNumber } from "./animated-number";
import { cn } from "@gnd/ui/cn";

type Props = {
    count: RouterOutputs["sales"]["inboundSummary"];
    title: string;
};
export function InboundSummarySkeleton() {
    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle>
                    <Skeleton className="h-8 w-32" />
                </CardTitle>
            </CardHeader>

            <CardContent>
                <div className="flex flex-col gap-2">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-4 w-24" />
                </div>
            </CardContent>
        </Card>
    );
}
export function InboundSummary({ count, title }: Props) {
    return (
        <Card className={cn("bg-inherit")}>
            <CardHeader className="pb-2 relative">
                <CardTitle className="font-mono font-medium text-2xl">
                    <AnimatedNumber
                        value={count}
                        currency="number"
                        maximumFractionDigits={0}
                        minimumFractionDigits={0}
                    />

                    {/* {dataWithDefaultCurrency.length > 1 && (
                        <div className="flex space-x-2 top-[63px] absolute">
                            {dataWithDefaultCurrency.map((item, idx) => (
                                <div
                                    key={item.currency}
                                    onMouseEnter={() => setActiveIndex(idx)}
                                    onClick={() => setActiveIndex(idx)}
                                    className={cn(
                                        "w-[10px] h-[3px] bg-[#1D1D1D] dark:bg-[#D9D9D9] opacity-30 transition-all",
                                        idx === activeIndex && "opacity-100",
                                    )}
                                />
                            ))}
                        </div>
                    )} */}
                </CardTitle>
            </CardHeader>

            <CardContent>
                <div className="flex flex-col gap-2">
                    <div>{title}</div>
                    <div className="text-sm text-muted-foreground">
                        {/* {t("invoice_count", {
                            count: totalInvoiceCount ?? 0,
                        })} */}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
