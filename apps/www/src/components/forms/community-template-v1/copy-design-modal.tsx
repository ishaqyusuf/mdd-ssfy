"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@gnd/ui/tanstack";
import { useTRPC } from "@/trpc/client";
import { useCommunityTemplateV1 } from "./context";
import { CustomModal } from "@/components/modals/custom-modal";
import { Input } from "@gnd/ui/input";
import { Button } from "@gnd/ui/button";
import { ScrollArea } from "@gnd/ui/scroll-area";
import { Badge } from "@gnd/ui/badge";
import { Icons } from "@gnd/ui/icons";
import { cn } from "@gnd/ui/cn";
import { toast } from "@gnd/ui/use-toast";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CopyDesignModal({ open, onOpenChange }: Props) {
    const trpc = useTRPC();
    const [q, setQ] = useState("");
    const { templateData, importDesignFromTemplate } = useCommunityTemplateV1();
    const { data, isPending } = useQuery(
        trpc.community.getCommunityTemplates.queryOptions(
            {
                q,
                size: 30,
            },
            {
                enabled: open,
            },
        ),
    );

    const items = useMemo(
        () =>
            (data?.data || []).filter((item) => item.id !== templateData?.id),
        [data?.data, templateData?.id],
    );

    return (
        <CustomModal
            open={open}
            onOpenChange={onOpenChange}
            size="2xl"
            title="Copy Design From Template"
            description="Search another model template and import its design into this v1 form."
        >
            <CustomModal.Content className="space-y-4">
                <div className="relative">
                    <Icons.Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Search by model name..."
                        className="pl-9"
                    />
                </div>

                <ScrollArea className="max-h-[55vh] rounded-xl border">
                    <div className="divide-y">
                        {isPending ? (
                            <div className="p-6 text-sm text-muted-foreground">
                                Loading templates...
                            </div>
                        ) : items.length ? (
                            items.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    className={cn(
                                        "flex w-full items-start justify-between gap-4 px-4 py-4 text-left transition-colors hover:bg-slate-50",
                                    )}
                                    onClick={() => {
                                        importDesignFromTemplate(item);
                                        toast({
                                            title: `Imported ${item.modelName} design`,
                                            variant: "success",
                                        });
                                        onOpenChange(false);
                                    }}
                                >
                                    <div className="min-w-0 space-y-1">
                                        <div className="flex items-center gap-2">
                                            <p className="truncate font-semibold text-slate-900">
                                                {item.modelName}
                                            </p>
                                            <Badge variant="secondary" className="shrink-0">
                                                {item.templateSummary?.configuredCount || 0} configs
                                            </Badge>
                                        </div>
                                        <p className="truncate text-sm text-slate-700">
                                            {item.project?.title}
                                        </p>
                                        <p className="truncate text-xs text-muted-foreground">
                                            {item.project?.builder?.name}
                                        </p>
                                    </div>
                                    <div className="shrink-0 text-xs font-medium text-muted-foreground">
                                        Import
                                    </div>
                                </button>
                            ))
                        ) : (
                            <div className="p-6 text-sm text-muted-foreground">
                                No templates found.
                            </div>
                        )}
                    </div>
                </ScrollArea>

            </CustomModal.Content>
            <CustomModal.Footer className="justify-end border-t pt-4">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                >
                    Cancel
                </Button>
            </CustomModal.Footer>
        </CustomModal>
    );
}
