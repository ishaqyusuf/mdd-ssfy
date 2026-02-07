"use client";

import {
    CommunityInstallCostRateProvider,
    useCreateCommunityInstallCostRateContext,
} from "@/hooks/use-community-install-costs";
import { useTRPC } from "@/trpc/client";
import { Table } from "@gnd/ui/composite";
import { SubmitButton } from "@gnd/ui/submit-button";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Download, History } from "lucide-react";
import { _qc, _trpc } from "../static-trpc";
import { InstallCostLine } from "./install-cost-line";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";

export default function CommunityInstallCostRate() {
    const ctx = useCreateCommunityInstallCostRateContext();
    if (!ctx?.communityInstallCostRates?.length && ctx?.legacyCosts?.length)
        return <LegacyImport costs={ctx.legacyCosts} />;
    return (
        <CommunityInstallCostRateProvider value={ctx}>
            <div className="flex">
                <div className="flex-1"></div>
                <Button
                    disabled={!!ctx?.editIndex}
                    size={"sm"}
                    onClick={() => ctx.setEditIndex(-1)}
                >
                    <Icons.Add className="h-4 w-4" />
                    Add New Rate
                </Button>
            </div>
            <Table className="">
                <Table.Header className="">
                    <Table.Row className="bg-muted hover:bg-muted [&>th]:uppercase [&>th]:border-r [&>th]:border-border [&>th]:last:border-0">
                        <Table.Head>Task</Table.Head>
                        <Table.Head className="w-[150px]">Cost</Table.Head>
                        <Table.Head className="w-[150px]">Max Qty</Table.Head>
                        <Table.Head></Table.Head>
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    <InstallCostLine rate={{} as any} />
                    {ctx?.communityInstallCostRates?.map((rate, index) => (
                        <InstallCostLine key={rate.id} rate={rate} />
                    ))}
                </Table.Body>
            </Table>
        </CommunityInstallCostRateProvider>
    );
}

function LegacyImport({ costs = [] }) {
    const { mutate: handleImport, isPending: isImporting } = useMutation(
        useTRPC().community.importLegacyInstallCosts.mutationOptions({
            onSuccess() {
                _qc.invalidateQueries({
                    queryKey:
                        _trpc.community.getCommunityInstallCostRates.queryKey(),
                });
            },
            meta: {
                debug: true,
                toastTitle: {
                    error: "Unable to complete",
                    loading: "Processing...",
                    success: "Done!.",
                },
            },
        }),
    );
    return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-in zoom-in-95 duration-300">
            <div className="w-24 h-24 bg-muted/50 rounded-full flex items-center justify-center mb-6 border-2 border-dashed border-border">
                <History size={40} className="text-muted-foreground" />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-2">
                Import Legacy Costs
            </h3>
            <p className="text-muted-foreground max-w-md mb-8">
                You have <strong>{costs.length}</strong> active costs in the
                current system. You can import your previous rate sheet from
                Version 1 to quickly populate your library.
            </p>

            <div className="flex flex-col gap-3 w-full max-w-sm">
                <SubmitButton
                    isSubmitting={isImporting}
                    onClick={(e) => handleImport()}
                    className=""
                    size="lg"
                >
                    <div className="flex gap-4 items-center">
                        <Download size={20} />
                        <span>Import from Old Install Costs (v1)</span>
                    </div>
                </SubmitButton>
                {/* <button
                    onClick={() => setViewMode("list")}
                    className="w-full py-3 bg-card border border-border text-foreground rounded-xl font-semibold text-sm hover:bg-muted transition-colors"
                >
                    Return to List
                </button> */}
            </div>

            {/* <p className="text-[10px] text-muted-foreground mt-8 uppercase tracking-widest font-bold">
                Only admins can perform bulk imports
            </p> */}
        </div>
    );
}

