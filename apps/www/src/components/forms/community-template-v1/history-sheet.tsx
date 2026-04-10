"use client";

import { useQuery } from "@gnd/ui/tanstack";
import { useTRPC } from "@/trpc/client";
import { useCommunityTemplateV1 } from "./context";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@gnd/ui/sheet";
import { ScrollArea } from "@gnd/ui/scroll-area";
import { formatDate } from "@gnd/utils/dayjs";
import { Badge } from "@gnd/ui/badge";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function TemplateHistorySheet({ open, onOpenChange }: Props) {
    const trpc = useTRPC();
    const { templateData } = useCommunityTemplateV1();
    const { data, isPending } = useQuery(
        trpc.community.getCommunityTemplateHistory.queryOptions(
            {
                slug: templateData.slug,
            },
            {
                enabled: open && !!templateData?.slug,
            },
        ),
    );

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full sm:max-w-md">
                <SheetHeader>
                    <SheetTitle>Template History</SheetTitle>
                </SheetHeader>
                <ScrollArea className="mt-4 h-[calc(100vh-6rem)] pr-4">
                    <div className="space-y-3">
                        {isPending ? (
                            <div className="rounded-xl border p-4 text-sm text-muted-foreground">
                                Loading history...
                            </div>
                        ) : data?.length ? (
                            data.map((entry) => (
                                <div
                                    key={entry.id}
                                    className="rounded-xl border bg-white p-4 shadow-sm"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-slate-900">
                                                {formatDate(entry.createdAt)}
                                            </p>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                {entry.author}
                                            </p>
                                        </div>
                                        <Badge variant="secondary">
                                            {entry.configsCount} configs
                                        </Badge>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="rounded-xl border p-4 text-sm text-muted-foreground">
                                No template history yet.
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
}
