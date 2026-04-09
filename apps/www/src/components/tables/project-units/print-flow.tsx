"use client";

import { Icons } from "@gnd/ui/icons";

import { useCommunityInstallCostParams } from "@/hooks/use-community-install-cost-params";
import { openLink } from "@/lib/open-link";
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
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

function StepRow(props: {
	label: string;
	status: "pending" | "loading" | "done" | "error";
	description?: string | null;
}) {
	return (
		<div className="flex items-start gap-3 rounded-xl border px-3 py-3">
			<div className="mt-0.5">
				{props.status === "loading" ? (
					<Icons.Loader2 className="size-4 animate-spin text-blue-600" />
				) : props.status === "done" ? (
					<Icons.CheckCircle2 className="size-4 text-emerald-600" />
				) : props.status === "error" ? (
					<Icons.AlertTriangle className="size-4 text-amber-600" />
				) : (
					<div className="size-4 rounded-full border border-slate-300" />
				)}
			</div>
			<div className="min-w-0 flex-1">
				<p className="text-sm font-medium">{props.label}</p>
				{props.description ? (
					<p className="text-xs text-muted-foreground">{props.description}</p>
				) : null}
			</div>
		</div>
	);
}

export function ProjectUnitsPrintFlowProvider(props: { children: ReactNode }) {
	const trpc = useTRPC();
	const { setParams: setInstallCostParams } = useCommunityInstallCostParams();
	const [selectedUnits, setSelectedUnits] = useState<PrintableUnit[]>([]);
	const [progressOpen, setProgressOpen] = useState(false);
	const [pendingOpen, setPendingOpen] = useState(false);

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
				enabled: progressOpen && selectedUnitIds.length > 0,
			},
		),
	);

	const sendToProductionMutation = useMutation(
		trpc.community.sendProjectUnitsToProduction.mutationOptions(),
	);

	const isReadyToPrint =
		!!preflightQuery.data &&
		!preflightQuery.data.missingInstallCosts.length &&
		!preflightQuery.data.summary.missingTemplateUnits;

	useEffect(() => {
		if (!progressOpen || !preflightQuery.data) return;
		if (preflightQuery.data.missingInstallCosts.length > 0) {
			setProgressOpen(false);
			setPendingOpen(true);
		}
	}, [progressOpen, preflightQuery.data]);

	const startPrint = (units: PrintableUnit[]) => {
		setSelectedUnits(units);
		setPendingOpen(false);
		setProgressOpen(true);
	};

	const handleConfirmPrint = async () => {
		const readyUnitIds = preflightQuery.data?.readyUnitIds || [];
		if (!readyUnitIds.length) return;
		try {
			openLink(
				"p/model-template",
				{
					preview: true,
					homeIds: readyUnitIds,
				},
				true,
			);
		} catch (error) {
			toast.error("Unable to complete the print workflow.");
		}
	};

	const handleSendToProduction = async () => {
		if (!preflightQuery.data) return;
		const eligibleUnitIds = preflightQuery.data.units
			.filter((unit) => unit.isReady && !unit.hasProductionActive)
			.map((unit) => unit.id);

		if (!eligibleUnitIds.length) {
			toast.error("All selected ready units are already active in production.");
			return;
		}

		try {
			await sendToProductionMutation.mutateAsync({
				unitIds: eligibleUnitIds,
				dueDate: null,
			});
			toast.success("Eligible selected units were sent to production.");
			await preflightQuery.refetch();
		} catch (error) {
			toast.error("Unable to send selected units to production.");
		}
	};

	const handleRecheck = async () => {
		const result = await preflightQuery.refetch();
		if (result.data?.missingInstallCosts.length) {
			setPendingOpen(true);
			toast.error("Some install costs are still missing.");
			return;
		}

		setPendingOpen(false);
		setProgressOpen(true);
	};

	const missingTemplateText = preflightQuery.data?.summary.missingTemplateUnits
		? `${preflightQuery.data.summary.missingTemplateUnits} selected units cannot be printed because their templates are missing.`
		: null;

	const installStepStatus = preflightQuery.isFetching
		? "loading"
		: preflightQuery.data?.missingInstallCosts.length
			? "error"
			: preflightQuery.data
				? "done"
				: "pending";
	const templateStepStatus = preflightQuery.isFetching
		? "pending"
		: preflightQuery.data?.summary.missingTemplateUnits
			? "error"
			: preflightQuery.data
				? "done"
				: "pending";

	return (
		<ProjectUnitsPrintFlowContext.Provider value={{ startPrint }}>
			{props.children}

			<Dialog open={progressOpen} onOpenChange={setProgressOpen}>
				<DialogContent className="sm:max-w-2xl">
					<DialogHeader>
						<DialogTitle>Prepare Project Unit Print</DialogTitle>
						<DialogDescription>
							Validate install costs and printable templates before sending the
							selected units to print.
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-3">
						<StepRow
							label="Checking install costs for each units"
							status={installStepStatus}
							description={
								preflightQuery.data?.missingInstallCosts.length
									? "Some selected models still need install-cost setup."
									: "Each selected model is being checked for install-cost readiness."
							}
						/>
						<StepRow
							label="Checking templates for each units"
							status={templateStepStatus}
							description={
								missingTemplateText ||
								"Each selected unit is being checked for a printable template."
							}
						/>
						<StepRow
							label="Ready to print"
							status={
								isReadyToPrint
									? "done"
									: preflightQuery.isFetching
										? "pending"
										: preflightQuery.data
											? "error"
											: "pending"
							}
							description={
								isReadyToPrint
									? `${preflightQuery.data.summary.readyUnits} units are ready to print.`
									: preflightQuery.data
										? "Printing stays blocked until all selected units pass the checks."
										: "Final print options will appear after the checks complete."
							}
						/>
					</div>

					{preflightQuery.data?.summary.missingTemplateUnits ? (
						<div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950">
							<p className="text-sm font-semibold">
								Missing printable templates
							</p>
							<div className="mt-2 space-y-2 text-sm">
								{preflightQuery.data.missingTemplates.map((entry) => (
									<div key={`${entry.projectName}-${entry.modelName}`}>
										<p className="font-medium">
											{entry.projectName || "Unknown project"} ·{" "}
											{entry.modelName || "Unknown model"}
										</p>
										<p className="text-xs text-amber-900/80">
											{entry.labels.join(", ")}
										</p>
									</div>
								))}
							</div>
						</div>
					) : null}

					{preflightQuery.data && isReadyToPrint ? (
						<div className="rounded-xl border bg-slate-50 px-4 py-3">
							<p className="text-sm font-medium">Ready actions</p>
							<p className="mt-2 text-xs text-muted-foreground">
								Print opens the print page and keeps this modal open. Use the
								production button separately when you are ready.
							</p>
							{preflightQuery.data.summary.productionActiveUnits ? (
								<p className="mt-2 text-xs text-amber-700">
									{preflightQuery.data.summary.productionActiveUnits} selected
									units are already active in production and will be skipped by
									the production action.
								</p>
							) : null}
						</div>
					) : null}

					<DialogFooter>
						{preflightQuery.data?.missingInstallCosts.length ? (
							<Button
								type="button"
								onClick={() => {
									setProgressOpen(false);
									setPendingOpen(true);
								}}
							>
								Review install costs
							</Button>
						) : null}
						{preflightQuery.data && isReadyToPrint ? (
							<>
								<Button
									type="button"
									variant="outline"
									onClick={() => void handleConfirmPrint()}
								>
									<Icons.Printer className="mr-2 size-4" />
									Print
								</Button>
								<Button
									type="button"
									onClick={() => void handleSendToProduction()}
									disabled={
										sendToProductionMutation.isPending ||
										preflightQuery.data.units.filter(
											(unit) => unit.isReady && !unit.hasProductionActive,
										).length === 0
									}
								>
									<Icons.Send className="mr-2 size-4" />
									Production
								</Button>
							</>
						) : null}
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={pendingOpen} onOpenChange={setPendingOpen}>
				<DialogContent className="sm:max-w-3xl">
					<DialogHeader>
						<DialogTitle>Install Cost Pending</DialogTitle>
						<DialogDescription>
							Set up install costs for the blocked models, then recheck the
							print readiness.
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
						{preflightQuery.data?.missingInstallCosts.map((entry) => (
							<div key={entry.modelId} className="rounded-xl border px-4 py-4">
								<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
									<div className="min-w-0">
										<p className="text-sm font-semibold">
											{entry.projectName || "Unknown project"} ·{" "}
											{entry.modelName || "Unknown model"}
										</p>
										<p className="text-xs text-muted-foreground">
											{entry.builderName || "Unknown builder"} ·{" "}
											{String(entry.templateVersion || "v1").toUpperCase()}
										</p>
										<p className="mt-2 text-sm text-muted-foreground">
											Affected units: {entry.labels.join(", ")}
										</p>
									</div>
									<Button
										type="button"
										onClick={() => {
											setInstallCostParams({
												editCommunityModelInstallCostId: entry.modelId,
												mode: "v2",
											});
										}}
									>
										<Icons.Wrench className="mr-2 size-4" />
										Open Setup
									</Button>
								</div>
							</div>
						))}

						{preflightQuery.data?.missingTemplates.length ? (
							<div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-amber-950">
								<p className="text-sm font-semibold">Template blockers</p>
								<div className="mt-2 space-y-2 text-sm">
									{preflightQuery.data.missingTemplates.map((entry) => (
										<div
											key={`${entry.projectName}-${entry.modelName}`}
											className={cn("rounded-lg bg-white/60 px-3 py-2")}
										>
											<p className="font-medium">
												{entry.projectName || "Unknown project"} ·{" "}
												{entry.modelName || "Unknown model"}
											</p>
											<p className="text-xs text-amber-900/80">
												{entry.labels.join(", ")}
											</p>
										</div>
									))}
								</div>
							</div>
						) : null}
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setPendingOpen(false)}
						>
							Close
						</Button>
						<Button type="button" onClick={() => void handleRecheck()}>
							Recheck readiness
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
