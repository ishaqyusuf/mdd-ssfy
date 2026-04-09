"use client";

import { useEffect, useState } from "react";

import {
	orderProductionGateRuleTypes,
	orderProductionGateTimeUnits,
} from "@/lib/order-production-gate";
import { useSalesQueryClient } from "@/hooks/use-sales-query-client";
import { useTRPC } from "@/trpc/client";
import { toast } from "sonner";

import { Button } from "@gnd/ui/button";
import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@gnd/ui/select";
import { useMutation } from "@gnd/ui/tanstack";

type ProductionGateCardProps = {
    salesOrderId: number;
    prodDueDate?: string | Date | null;
    productionGate?: {
        ruleType?: string | null;
        leadTimeValue?: number | null;
        leadTimeUnit?: string | null;
    } | null;
    hasProductionDefinition?: boolean;
    productionGateStatus?: string | null;
};

const ruleLabels = {
    fully_paid: "When order is fully paid",
    half_paid: "When order is half paid",
    lead_time_before_delivery: "X time before production due date",
} as const;

const unitLabels = {
    day: "Day(s)",
    week: "Week(s)",
} as const;

function statusCopy(status?: string | null, hasDefinition?: boolean) {
    if (!hasDefinition || status === "missing") {
        return {
            label: "Definition Needed",
            tone: "bg-amber-100 text-amber-800",
            message:
                "Save a production kickoff rule before this order can fully close from sales.",
        };
    }
    if (status === "triggered") {
        return {
            label: "Triggered",
            tone: "bg-emerald-100 text-emerald-800",
            message:
                "This production gate has been triggered and the order is ready for production follow-through.",
        };
    }
    return {
        label: "Defined",
        tone: "bg-blue-100 text-blue-800",
        message:
            "The kickoff rule is saved. Production can begin when the trigger condition is met.",
    };
}

export function OrderProductionGateCard({
    salesOrderId,
    prodDueDate,
    productionGate,
    hasProductionDefinition,
    productionGateStatus,
}: ProductionGateCardProps) {
	const status = statusCopy(productionGateStatus, hasProductionDefinition);
	const sq = useSalesQueryClient();
	const trpc = useTRPC();
	const [ruleType, setRuleType] = useState<string>(
		productionGate?.ruleType || "fully_paid",
	);
	const [leadTimeValue, setLeadTimeValue] = useState<number>(
		productionGate?.leadTimeValue || 1,
	);
	const [leadTimeUnit, setLeadTimeUnit] = useState<string>(
		productionGate?.leadTimeUnit || "week",
	);

	useEffect(() => {
		setRuleType(productionGate?.ruleType || "fully_paid");
		setLeadTimeValue(productionGate?.leadTimeValue || 1);
		setLeadTimeUnit(productionGate?.leadTimeUnit || "week");
	}, [
		productionGate?.leadTimeUnit,
		productionGate?.leadTimeValue,
		productionGate?.ruleType,
	]);

	const saveGate = useMutation(
		trpc.sales.saveOrderProductionGate.mutationOptions({
			onSuccess() {
				sq.invalidate.productionOverview();
				sq.invalidate.saleOverview();
				sq.invalidate.salesList();
				toast.success("Production kickoff saved");
			},
			onError(error) {
				toast.error(error.message || "Unable to save kickoff");
			},
		}),
	);

	const usesLeadTime = ruleType === "lead_time_before_delivery";

	return (
		<div className="rounded-xl border bg-card p-5">
			<div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
				<div className="space-y-1">
					<p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
						Production Gate
					</p>
					<h3 className="text-lg font-semibold">
						Define when production should kick off
					</h3>
					<p className="text-sm text-muted-foreground">
						{status.message}
					</p>
				</div>
				<span
					className={`inline-flex w-fit rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest ${status.tone}`}
				>
					{status.label}
				</span>
			</div>

			<div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_120px_140px_auto] md:items-end">
				<div className="space-y-2">
					<Label>Kickoff rule</Label>
					<Select value={ruleType} onValueChange={setRuleType}>
						<SelectTrigger>
							<SelectValue placeholder="Select rule" />
						</SelectTrigger>
						<SelectContent>
							{orderProductionGateRuleTypes.map((rule) => (
								<SelectItem key={rule} value={rule}>
									{ruleLabels[rule]}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div className="space-y-2">
					<Label>Lead time</Label>
					<Input
						type="number"
						min={1}
						value={leadTimeValue}
						disabled={!usesLeadTime}
						onChange={(e) => {
							setLeadTimeValue(Number(e.target.value || 1));
						}}
					/>
				</div>

				<div className="space-y-2">
					<Label>Unit</Label>
					<Select
						value={leadTimeUnit}
						onValueChange={setLeadTimeUnit}
						disabled={!usesLeadTime}
					>
						<SelectTrigger>
							<SelectValue placeholder="Select unit" />
						</SelectTrigger>
						<SelectContent>
							{orderProductionGateTimeUnits.map((unit) => (
								<SelectItem key={unit} value={unit}>
									{unitLabels[unit]}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<Button
					disabled={saveGate.isPending}
					onClick={() => {
						if (usesLeadTime && !prodDueDate) {
							toast.error(
								"Set a production due date before using a lead-time kickoff rule.",
							);
							return;
						}
						saveGate.mutate({
							salesOrderId,
							ruleType: ruleType as
								| "fully_paid"
								| "half_paid"
								| "lead_time_before_delivery",
							leadTimeValue: usesLeadTime ? leadTimeValue : null,
							leadTimeUnit: usesLeadTime
								? (leadTimeUnit as "day" | "week")
								: null,
						});
					}}
				>
					{saveGate.isPending ? "Saving..." : "Save Kickoff"}
				</Button>
			</div>

			{usesLeadTime ? (
				<p className="mt-3 text-xs text-muted-foreground">
					Trigger date is calculated from the order production due date.
				</p>
			) : null}
		</div>
	);
}
