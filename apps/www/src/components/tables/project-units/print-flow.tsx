"use client";

import { useCommunityInstallCostParams } from "@/hooks/use-community-install-cost-params";
import { openLink } from "@/lib/open-link";
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
import { cn } from "@gnd/ui/cn";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@gnd/ui/dialog";
import { useMutation, useQuery } from "@gnd/ui/tanstack";
import {
    AlertTriangle,
    CheckCircle2,
    ExternalLink,
    Loader2,
    Printer,
    Send,
    Wrench,
} from "lucide-react";
import {
    type ReactNode,
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import { toast } from "sonner";

type PrintableUnit = {
    id: number;
    slug?: string | null;
    lotBlock?: string | null;
    modelName?: string | null;
};

type ProjectUnitsPrintFlowContextValue = {
    startPrint: (units: PrintableUnit[]) => void;
};

const ProjectUnitsPrintFlowContext =
    createContext<ProjectUnitsPrintFlowContextValue | null>(null);

function SummaryCard(props: {
    label: string;
    value: number;
    tone?: "default" | "success" | "warning";
}) {
    const toneClass =
        props.tone === "success"
            ? "border-emerald-200 bg-emerald-50 text-emerald-900"
            : props.tone === "warning"
              ? "border-red-200 bg-red-50 text-red-950"
              : "border-border bg-muted/30";
    return (
        <div className={cn("rounded-xl border px-3 py-3", toneClass)}>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {props.label}
            </p>
            <p className="mt-1 text-lg font-semibold">{props.value}</p>
        </div>
    );
}

export function ProjectUnitsPrintFlowProvider(props: { children: ReactNode }) {
    const trpc = useTRPC();
    const { setParams: setInstallCostParams } = useCommunityInstallCostParams();
    const [selectedUnits, setSelectedUnits] = useState<PrintableUnit[]>([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [unitChecks, setUnitChecks] = useState<Record<number, boolean>>({});

    const selectedUnitIds = useMemo(
        () => selectedUnits.map((unit) => unit.id),
        [selectedUnits],
    );

    const preflightQuery = useQuery(
        trpc.community.getProjectUnitPrintPreflight.queryOptions(
            {
                unitIds: selectedUnitIds,
            },
            {
                enabled: modalOpen && selectedUnitIds.length > 0,
            },
        ),
    );

    const sendToProductionMutation = useMutation(
        trpc.community.sendProjectUnitsToProduction.mutationOptions(),
    );

    useEffect(() => {
        if (!selectedUnits.length) {
            setUnitChecks({});
            return;
        }

        setUnitChecks((current) => {
            const next = { ...current };
            for (const unit of selectedUnits) {
                if (next[unit.id] === undefined) {
                    next[unit.id] = true;
                }
            }

            for (const unitId of Object.keys(next)) {
                if (!selectedUnits.find((unit) => unit.id === Number(unitId))) {
                    delete next[Number(unitId)];
                }
            }

            return next;
        });
    }, [selectedUnits]);

    const startPrint = (units: PrintableUnit[]) => {
        setSelectedUnits(units);
        setUnitChecks(
            Object.fromEntries(units.map((unit) => [unit.id, true])) as Record<
                number,
                boolean
            >,
        );
        setModalOpen(true);
    };

    const toggleUnit = (unitId: number, checked: boolean) => {
        setUnitChecks((current) => ({
            ...current,
            [unitId]: checked,
        }));
    };

    const checkedPrintableUnits =
        preflightQuery.data?.units.filter(
            (unit) => unitChecks[unit.id] !== false && unit.canPrint,
        ) || [];
    const checkedProductionUnits =
        preflightQuery.data?.units.filter(
            (unit) => unitChecks[unit.id] !== false && unit.canSendToProduction,
        ) || [];

    const handlePrint = async () => {
        if (!checkedPrintableUnits.length) {
            toast.error("No checked units have a printable template.");
            return;
        }

        const version = checkedPrintableUnits[0]?.templateVersion || "v1";
        const templateSlug =
            checkedPrintableUnits[0]?.templateSlug || undefined;

        try {
            openLink(
                "p/model-template",
                {
                    preview: true,
                    homeIds: checkedPrintableUnits
                        .map((unit) => unit.id)
                        ?.join(","),
                    version,
                    templateSlug,
                },
                true,
            );
        } catch {
            toast.error("Unable to open the print page.");
        }
    };

    const handleSendToProduction = async () => {
        if (!checkedProductionUnits.length) {
            toast.error("No checked units are eligible for production.");
            return;
        }

        try {
            await sendToProductionMutation.mutateAsync({
                unitIds: checkedProductionUnits.map((unit) => unit.id),
                dueDate: null,
            });
            toast.success("Selected eligible units were sent to production.");
            await preflightQuery.refetch();
        } catch {
            toast.error("Unable to send selected units to production.");
        }
    };

    return (
        <ProjectUnitsPrintFlowContext.Provider value={{ startPrint }}>
            {props.children}

            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="sm:max-w-5xl">
                    <DialogHeader>
                        <DialogTitle>
                            Review Project Units Before Print
                        </DialogTitle>
                        <DialogDescription>
                            Review each selected unit, adjust the included rows,
                            then print or send eligible units to production
                            without closing this modal.
                        </DialogDescription>
                    </DialogHeader>

                    {preflightQuery.isLoading ? (
                        <div className="flex min-h-[240px] items-center justify-center gap-3 text-sm text-muted-foreground">
                            <Loader2 className="size-4 animate-spin" />
                            <span>
                                Checking units for print and production
                                readiness...
                            </span>
                        </div>
                    ) : null}

                    {preflightQuery.data ? (
                        <div className="space-y-4">
                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                                <SummaryCard
                                    label="Printable"
                                    value={checkedPrintableUnits.length}
                                    tone="success"
                                />
                                <SummaryCard
                                    label="Production Ready"
                                    value={checkedProductionUnits.length}
                                    tone="success"
                                />
                                <SummaryCard
                                    label="Missing Install Cost"
                                    value={
                                        preflightQuery.data.summary
                                            .missingInstallCostUnits
                                    }
                                    tone="warning"
                                />
                                <SummaryCard
                                    label="Partial Install Cost"
                                    value={
                                        preflightQuery.data.summary
                                            .partialInstallCostUnits
                                    }
                                    tone="warning"
                                />
                                <SummaryCard
                                    label="Template Not Printable"
                                    value={
                                        preflightQuery.data.summary
                                            .missingTemplateUnits +
                                        preflightQuery.data.summary
                                            .emptyTemplateUnits
                                    }
                                    tone="warning"
                                />
                            </div>

                            <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
                                {preflightQuery.data.units.map((unit) => {
                                    const checked =
                                        unitChecks[unit.id] !== false;
                                    const templatePath =
                                        unit.templateVersion === "v2"
                                            ? "model-template"
                                            : "community-template";
                                    const templateHref = unit.templateSlug
                                        ? `/community/${templatePath}/${unit.templateSlug.toLowerCase()}`
                                        : null;

                                    return (
                                        <div
                                            key={unit.id}
                                            className={cn(
                                                "rounded-xl border px-4 py-4",
                                                checked
                                                    ? "bg-background"
                                                    : "bg-muted/30 opacity-80",
                                            )}
                                        >
                                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                                <div className="min-w-0 flex-1 space-y-3">
                                                    <div className="flex items-start gap-3">
                                                        <Checkbox
                                                            checked={checked}
                                                            onCheckedChange={(
                                                                value,
                                                            ) =>
                                                                toggleUnit(
                                                                    unit.id,
                                                                    value ===
                                                                        true,
                                                                )
                                                            }
                                                        />
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-semibold">
                                                                {unit.label}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {unit.projectName ||
                                                                    "Unknown project"}{" "}
                                                                ·{" "}
                                                                {unit.builderName ||
                                                                    "Unknown builder"}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="grid gap-2 text-sm">
                                                        <div className="flex items-start gap-2">
                                                            {unit.installCostStatus ===
                                                                "ready" ||
                                                            unit.installCostStatus ===
                                                                "not-required" ? (
                                                                <CheckCircle2 className="mt-0.5 size-4 text-emerald-600" />
                                                            ) : (
                                                                <AlertTriangle className="mt-0.5 size-4 text-amber-600" />
                                                            )}
                                                            <p className="text-muted-foreground">
                                                                {unit.installCostTotalTasks
                                                                    ? `${unit.installCostConfiguredTasks}/${unit.installCostTotalTasks} install cost configured`
                                                                    : "No install cost tasks required"}
                                                                {unit.installCostReason
                                                                    ? ` · ${unit.installCostReason}`
                                                                    : ""}
                                                            </p>
                                                        </div>

                                                        <div className="flex items-start gap-2">
                                                            {unit.canPrint ? (
                                                                <CheckCircle2 className="mt-0.5 size-4 text-emerald-600" />
                                                            ) : (
                                                                <AlertTriangle className="mt-0.5 size-4 text-amber-600" />
                                                            )}
                                                            <p className="text-muted-foreground">
                                                                {!unit.hasTemplate
                                                                    ? "Template not found and will not be printed."
                                                                    : unit.isTemplateEmpty
                                                                      ? "Template is empty and will not be printed."
                                                                      : `${unit.templateConfiguredCount} template config values available for print.`}
                                                            </p>
                                                        </div>

                                                        <div className="flex items-start gap-2">
                                                            <CheckCircle2 className="mt-0.5 size-4 text-slate-500" />
                                                            <p className="text-muted-foreground">
                                                                {unit.jobCount}{" "}
                                                                jobs submitted
                                                            </p>
                                                        </div>

                                                        <div className="flex items-start gap-2">
                                                            <CheckCircle2 className="mt-0.5 size-4 text-slate-500" />
                                                            <p className="text-muted-foreground">
                                                                Production
                                                                status:{" "}
                                                                {
                                                                    unit.productionStatus
                                                                }
                                                                {unit.hasProductionActive
                                                                    ? " · already active"
                                                                    : ""}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap gap-2 lg:max-w-[280px] lg:justify-end">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => {
                                                            if (
                                                                !unit.templateId
                                                            )
                                                                return;
                                                            setInstallCostParams(
                                                                {
                                                                    editCommunityModelInstallCostId:
                                                                        unit.templateId,
                                                                    mode: "v2",
                                                                    view: "template-list",
                                                                },
                                                            );
                                                        }}
                                                        disabled={
                                                            !unit.templateId
                                                        }
                                                    >
                                                        <Wrench className="mr-2 size-4" />
                                                        Install Cost
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => {
                                                            if (!templateHref)
                                                                return;
                                                            window.open(
                                                                templateHref,
                                                                "_blank",
                                                                "noopener,noreferrer",
                                                            );
                                                        }}
                                                        disabled={!templateHref}
                                                    >
                                                        <ExternalLink className="mr-2 size-4" />
                                                        Template
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => {
                                                            window.open(
                                                                unit.jobsHref,
                                                                "_blank",
                                                                "noopener,noreferrer",
                                                            );
                                                        }}
                                                        disabled={
                                                            !unit.jobCount
                                                        }
                                                    >
                                                        <ExternalLink className="mr-2 size-4" />
                                                        Jobs
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : null}

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => void handlePrint()}
                            disabled={
                                !preflightQuery.data ||
                                !checkedPrintableUnits.length
                            }
                        >
                            <Printer className="mr-2 size-4" />
                            Print
                        </Button>
                        <Button
                            type="button"
                            onClick={() => void handleSendToProduction()}
                            disabled={
                                !preflightQuery.data ||
                                sendToProductionMutation.isPending ||
                                !checkedProductionUnits.length
                            }
                        >
                            {sendToProductionMutation.isPending ? (
                                <Loader2 className="mr-2 size-4 animate-spin" />
                            ) : (
                                <Send className="mr-2 size-4" />
                            )}
                            Production
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </ProjectUnitsPrintFlowContext.Provider>
    );
}

export function useProjectUnitsPrintFlow() {
    const context = useContext(ProjectUnitsPrintFlowContext);
    if (!context) {
        throw new Error(
            "useProjectUnitsPrintFlow must be used within ProjectUnitsPrintFlowProvider",
        );
    }
    return context;
}
