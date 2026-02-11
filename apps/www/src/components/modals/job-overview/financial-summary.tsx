import { useJobOverviewContext } from "@/contexts/job-overview-context";

export function FinancialSummary() {
    const ctx = useJobOverviewContext();
    const { overview: job } = ctx;
    return (
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-border bg-muted/20">
                <h3 className="font-bold text-foreground">Financial Summary</h3>
            </div>
            <div className="p-5 space-y-4">
                <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-bold text-foreground">
                        ${job.financials.subtotal.toFixed(2)}
                    </span>
                </div>
                {job.financials.addonValue > 0 && (
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground flex items-center gap-1">
                            Add-on ({job.financials.addonPercent}%)
                            <span className="text-[10px] bg-muted px-1 rounded border border-border text-muted-foreground">
                                Fixed
                            </span>
                        </span>
                        <span className="font-bold text-green-600">
                            +${job.financials.addonValue.toFixed(2)}
                        </span>
                    </div>
                )}
                <div className="h-px bg-border my-2" />
                <div className="flex justify-between items-end">
                    <span className="text-sm font-bold text-foreground uppercase">
                        Grand Total
                    </span>
                    <span className="text-2xl font-black text-primary">
                        ${job.financials.total.toFixed(2)}
                    </span>
                </div>
            </div>
        </div>
    );
}

