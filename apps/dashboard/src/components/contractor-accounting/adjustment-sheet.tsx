"use client";

import {
	getDefaultContractorAccountingPeriod,
	useContractorAccountingFilterParams,
} from "@/hooks/use-contractor-accounting-filter-params";
import { useTRPC } from "@/trpc/client";
import type { RouterInputs } from "@api/trpc/routers/_app";
import { Button } from "@gnd/ui/button";
import { Input } from "@gnd/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@gnd/ui/select";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@gnd/ui/sheet";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { Textarea } from "@gnd/ui/textarea";
import { toast } from "@gnd/ui/use-toast";
import { useState } from "react";

type AdjustmentType =
	RouterInputs["contractorAccounting"]["createAdjustment"]["type"];

export function ContractorAdjustmentSheet() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const { params, setParams } = useContractorAccountingFilterParams();
	const defaults = getDefaultContractorAccountingPeriod();
	const [contractorId, setContractorId] = useState("");
	const [type, setType] = useState<AdjustmentType>("BONUS");
	const [amount, setAmount] = useState("");
	const [effectiveDate, setEffectiveDate] = useState(defaults.to);
	const [description, setDescription] = useState("");
	const options = useQuery({
		...trpc.contractorAccounting.filterOptions.queryOptions(),
		enabled: Boolean(params.createAdjustment),
	});
	const createAdjustment = useMutation(
		trpc.contractorAccounting.createAdjustment.mutationOptions({
			async onSuccess() {
				toast({
					title: "Adjustment posted",
					description:
						"The immutable ledger entry is available in the active view.",
				});
				setContractorId("");
				setAmount("");
				setDescription("");
				await Promise.all([
					queryClient.invalidateQueries({
						queryKey: trpc.contractorAccounting.entries.queryKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.contractorAccounting.summary.queryKey(),
					}),
				]);
				void setParams({ createAdjustment: null });
			},
			onError(error) {
				toast({
					variant: "error",
					title: "Adjustment not posted",
					description: error.message,
				});
			},
		}),
	);

	function submit(event: React.FormEvent) {
		event.preventDefault();
		createAdjustment.mutate({
			contractorId: Number(contractorId),
			type,
			amount,
			effectiveDate,
			timezone: defaults.timezone,
			description,
		});
	}

	return (
		<Sheet
			open={Boolean(params.createAdjustment)}
			onOpenChange={(open) => {
				if (!open) void setParams({ createAdjustment: null });
			}}
		>
			<SheetContent className="w-full overflow-y-auto sm:max-w-xl">
				<SheetHeader className="text-left">
					<SheetTitle>New contractor adjustment</SheetTitle>
					<SheetDescription>
						Post a bonus, reimbursable expense, or deduction. Entries are
						immutable and corrections use reversals.
					</SheetDescription>
				</SheetHeader>
				<form className="mt-6 space-y-5" onSubmit={submit}>
					<div className="space-y-2">
						<label
							htmlFor="adjustment-contractor"
							className="text-sm font-medium"
						>
							Contractor
						</label>
						<Select value={contractorId} onValueChange={setContractorId}>
							<SelectTrigger id="adjustment-contractor">
								<SelectValue placeholder="Select contractor" />
							</SelectTrigger>
							<SelectContent>
								{options.data?.contractors.map((contractor) => (
									<SelectItem key={contractor.id} value={contractor.id}>
										{contractor.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-2">
							<label htmlFor="adjustment-type" className="text-sm font-medium">
								Type
							</label>
							<Select
								value={type}
								onValueChange={(value) => setType(value as AdjustmentType)}
							>
								<SelectTrigger id="adjustment-type">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="BONUS">Bonus</SelectItem>
									<SelectItem value="EXPENSE">Expense</SelectItem>
									<SelectItem value="DEDUCTION">Deduction</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<label
								htmlFor="adjustment-amount"
								className="text-sm font-medium"
							>
								Amount
							</label>
							<Input
								id="adjustment-amount"
								inputMode="decimal"
								value={amount}
								onChange={(event) => setAmount(event.target.value)}
								placeholder="0.00"
								required
							/>
						</div>
					</div>
					<div className="space-y-2">
						<label htmlFor="adjustment-date" className="text-sm font-medium">
							Effective date
						</label>
						<Input
							id="adjustment-date"
							type="date"
							value={effectiveDate}
							onChange={(event) => setEffectiveDate(event.target.value)}
							required
						/>
					</div>
					<div className="space-y-2">
						<label
							htmlFor="adjustment-description"
							className="text-sm font-medium"
						>
							Business reason
						</label>
						<Textarea
							id="adjustment-description"
							value={description}
							onChange={(event) => setDescription(event.target.value)}
							placeholder="Describe why this adjustment is required."
							rows={5}
							required
						/>
					</div>
					<Button
						type="submit"
						className="w-full"
						disabled={
							createAdjustment.isPending ||
							!contractorId ||
							!amount ||
							description.trim().length < 3
						}
					>
						{createAdjustment.isPending ? "Posting…" : "Post adjustment"}
					</Button>
				</form>
			</SheetContent>
		</Sheet>
	);
}
