"use client";

import { useCommunityInstallCostParams } from "@/hooks/use-community-install-cost-params";
import { openLink } from "@/lib/open-link";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
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

function SummaryBadge({
	label,
	value,
	tone = "default",
}: {
	label: string;
	value: number;
	tone?: "default" | "success" | "warning";
}) {
	return (
		<div
			className={cn(
				"rounded-md border px-3 py-2",
				tone === "success" && "border-emerald-200 bg-emerald-50",
				tone === "warning" && "border-red-200 bg-red-50",
				tone === "default" && "border-border bg-muted/30",
			)}
		>
			<p className="text-[11px] font-semibold uppercase text-muted-foreground">
				{label}
			</p>
			<p className="text-lg font-semibold">{value}</p>
		</div>
	);
}

export function ProjectUnitsPrintFlowProvider({
	children,
}: {
	children: ReactNode;
}) {
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

	const checkedPrintableUnits =
		preflightQuery.data?.units.filter(
			(unit) => unitChecks[unit.id] !== false && unit.canPrint,
		) || [];
	const checkedProductionUnits =
		preflightQuery.data?.units.filter(
			(unit) => unitChecks[unit.id] !== false && unit.canSendToProduction,
		) || [];

	const handlePrint = () => {
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
					homeIds: checkedPrintableUnits.map((unit) => unit.id).join(","),
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
			{children}

			<Dialog open={modalOpen} onOpenChange={setModalOpen}>
				<DialogContent className="sm:max-w-5xl">
					<DialogHeader>
						<DialogTitle>Review project units before print</DialogTitle>
						<DialogDescription>
							Choose the units to include, then print or send eligible units to
							production.
						</DialogDescription>
					</DialogHeader>

					{preflightQuery.isLoading ? (
						<div className="flex min-h-[240px] items-center justify-center gap-3 text-sm text-muted-foreground">
							<Loader2 className="size-4 animate-spin" />
							<span>Checking print and production readiness...</span>
						</div>
					) : null}

					{preflightQuery.data ? (
						<div className="space-y-4">
							<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
								<SummaryBadge
									label="Printable"
									value={checkedPrintableUnits.length}
									tone="success"
								/>
								<SummaryBadge
									label="Production Ready"
									value={checkedProductionUnits.length}
									tone="success"
								/>
								<SummaryBadge
									label="Missing Install Cost"
									value={preflightQuery.data.summary.missingInstallCostUnits}
									tone="warning"
								/>
								<SummaryBadge
									label="Partial Install Cost"
									value={preflightQuery.data.summary.partialInstallCostUnits}
									tone="warning"
								/>
								<SummaryBadge
									label="Template Not Printable"
									value={
										preflightQuery.data.summary.missingTemplateUnits +
										preflightQuery.data.summary.emptyTemplateUnits
									}
									tone="warning"
								/>
							</div>

							<div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
								{preflightQuery.data.units.map((unit) => {
									const checked = unitChecks[unit.id] !== false;
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
												"rounded-md border px-4 py-3",
												checked ? "bg-background" : "bg-muted/30 opacity-80",
											)}
										>
											<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
												<div className="min-w-0 flex-1 space-y-3">
													<div className="flex items-start gap-3">
														<Checkbox
															checked={checked}
															onCheckedChange={(value) =>
																setUnitChecks((current) => ({
																	...current,
																	[unit.id]: value === true,
																}))
															}
														/>
														<div className="min-w-0">
															<p className="truncate text-sm font-semibold">
																{unit.label}
															</p>
															<p className="truncate text-xs text-muted-foreground">
																{unit.projectName || "Unknown project"} /{" "}
																{unit.builderName || "Unknown builder"}
															</p>
														</div>
													</div>

													<div className="grid gap-2 text-sm">
														<StatusLine
															ready={
																unit.installCostStatus === "ready" ||
																unit.installCostStatus === "not-required"
															}
															label={
																unit.installCostStatus === "not-required"
																	? "Install cost not required"
																	: unit.installCostStatus === "ready"
																		? "Install cost ready"
																		: unit.installCostStatus === "partial"
																			? "Install cost partially configured"
																			: "Install cost missing"
															}
														/>
														<StatusLine
															ready={unit.canPrint}
															label={
																unit.canPrint
																	? "Template can be printed"
																	: "Template is not printable yet"
															}
														/>
														<StatusLine
															ready={unit.canSendToProduction}
															label={
																unit.canSendToProduction
																	? "Eligible for production"
																	: "Not eligible for production yet"
															}
														/>
													</div>
												</div>

												<div className="flex flex-wrap gap-2 lg:justify-end">
													{templateHref ? (
														<Button asChild variant="outline" size="sm">
															<a href={templateHref}>
																<ExternalLink className="mr-2 size-4" />
																Template
															</a>
														</Button>
													) : null}
													{unit.templateId ? (
														<Button
															variant="outline"
															size="sm"
															onClick={() =>
																setInstallCostParams({
																	editCommunityModelInstallCostId:
																		unit.templateId,
																	mode: "v2",
																	view: "template-list",
																})
															}
														>
															<Wrench className="mr-2 size-4" />
															Install cost
														</Button>
													) : null}
													<Badge variant="outline">
														{unit.jobCount} submitted
													</Badge>
												</div>
											</div>
										</div>
									);
								})}
							</div>
						</div>
					) : null}

					<DialogFooter className="gap-2 sm:justify-between">
						<Button variant="outline" onClick={() => setModalOpen(false)}>
							Close
						</Button>
						<div className="flex flex-wrap justify-end gap-2">
							<Button
								variant="outline"
								onClick={handleSendToProduction}
								disabled={sendToProductionMutation.isPending}
							>
								<Send className="mr-2 size-4" />
								Send to production
							</Button>
							<Button onClick={handlePrint}>
								<Printer className="mr-2 size-4" />
								Print
							</Button>
						</div>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</ProjectUnitsPrintFlowContext.Provider>
	);
}

function StatusLine({ ready, label }: { ready: boolean; label: string }) {
	return (
		<div className="flex items-center gap-2">
			{ready ? (
				<CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
			) : (
				<AlertTriangle className="size-4 shrink-0 text-amber-600" />
			)}
			<span className="text-sm">{label}</span>
		</div>
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
