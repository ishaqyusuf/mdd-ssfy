"use client";

import { useContractorAccountingFilterParams } from "@/hooks/use-contractor-accounting-filter-params";
import { useTRPC } from "@/trpc/client";
import type { RouterInputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@gnd/ui/tabs";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import { useState } from "react";

type AlertKind =
	RouterInputs["contractorAccounting"]["createAlertRule"]["kind"];

export function ContractorAccountingAlertsSheet() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const { params, filters, setParams } = useContractorAccountingFilterParams();
	const open = Boolean(params.manageAlerts);
	const [name, setName] = useState("");
	const [kind, setKind] = useState<AlertKind>("BALANCE_THRESHOLD");
	const [threshold, setThreshold] = useState("");
	const [recipients, setRecipients] = useState("");
	const rules = useQuery({
		...trpc.contractorAccounting.alertRules.queryOptions(),
		enabled: open,
	});
	const events = useQuery({
		...trpc.contractorAccounting.alertEvents.queryOptions({
			statuses: ["OPEN", "ACKNOWLEDGED"],
		}),
		enabled: open,
	});
	const refresh = () =>
		Promise.all([
			queryClient.invalidateQueries({
				queryKey: trpc.contractorAccounting.alertRules.queryKey(),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.contractorAccounting.alertEvents.queryKey(),
			}),
		]);
	const create = useMutation(
		trpc.contractorAccounting.createAlertRule.mutationOptions({
			async onSuccess() {
				setName("");
				setThreshold("");
				toast({ title: "Accounting alert rule created" });
				await refresh();
			},
			onError(error) {
				toast({
					variant: "error",
					title: "Alert rule not created",
					description: error.message,
				});
			},
		}),
	);
	const updateRule = useMutation(
		trpc.contractorAccounting.updateAlertRule.mutationOptions({
			async onSuccess() {
				await refresh();
			},
		}),
	);
	const updateEvent = useMutation(
		trpc.contractorAccounting.updateAlertEvent.mutationOptions({
			async onSuccess() {
				await refresh();
			},
		}),
	);
	return (
		<Sheet
			open={open}
			onOpenChange={(next) => {
				if (!next) void setParams({ manageAlerts: null });
			}}
		>
			<SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
				<SheetHeader className="text-left">
					<SheetTitle>Accounting alerts</SheetTitle>
					<SheetDescription>
						Monitor high balances, aging liabilities, stale reconciliation, W-9
						blockers, and overdue period closes.
					</SheetDescription>
				</SheetHeader>
				<Tabs defaultValue="events" className="mt-6">
					<TabsList className="grid w-full grid-cols-2">
						<TabsTrigger value="events">Open alerts</TabsTrigger>
						<TabsTrigger value="rules">Rules</TabsTrigger>
					</TabsList>
					<TabsContent value="events" className="mt-4 space-y-3">
						{events.data?.map((event) => (
							<div key={event.id} className="rounded-xl border p-4">
								<div className="flex items-start justify-between gap-3">
									<div>
										<p className="font-medium">{event.title}</p>
										<p className="mt-1 text-sm text-muted-foreground">
											{event.message}
										</p>
										<p className="mt-2 text-xs text-muted-foreground">
											{event.rule.name} ·{" "}
											{new Date(event.triggeredAt).toLocaleString()}
										</p>
									</div>
									<div className="flex flex-col items-end gap-1">
										<Badge variant="outline">{event.status}</Badge>
										<Badge variant="secondary">
											{event.emailDeliveredAt
												? "Email sent"
												: event.emailDeliveryError
													? "Email retrying"
													: "Email pending"}
										</Badge>
									</div>
								</div>
								<div className="mt-3 flex gap-2">
									{event.status === "OPEN" ? (
										<Button
											size="sm"
											variant="outline"
											onClick={() =>
												updateEvent.mutate({
													id: event.id,
													status: "ACKNOWLEDGED",
												})
											}
										>
											Acknowledge
										</Button>
									) : null}
									<Button
										size="sm"
										onClick={() =>
											updateEvent.mutate({
												id: event.id,
												status: "RESOLVED",
											})
										}
									>
										Resolve
									</Button>
								</div>
							</div>
						))}
						{events.data && !events.data.length ? (
							<p className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
								No open accounting alerts.
							</p>
						) : null}
					</TabsContent>
					<TabsContent value="rules" className="mt-4 space-y-5">
						<form
							className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2"
							onSubmit={(event) => {
								event.preventDefault();
								create.mutate({
									name,
									kind,
									timezone: filters.timezone,
									recipients: recipients
										.split(",")
										.map((value) => value.trim())
										.filter(Boolean),
									...(kind === "BALANCE_THRESHOLD"
										? { thresholdAmount: threshold }
										: kind === "LIABILITY_AGE"
											? { thresholdDays: Number(threshold) }
											: {}),
								});
							}}
						>
							<Input
								value={name}
								onChange={(event) => setName(event.target.value)}
								placeholder="High contractor balance"
							/>
							<Select
								value={kind}
								onValueChange={(value) => setKind(value as AlertKind)}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{[
										"BALANCE_THRESHOLD",
										"LIABILITY_AGE",
										"RECONCILIATION_STALE",
										"W9_BLOCKER",
										"PERIOD_CLOSE",
									].map((value) => (
										<SelectItem key={value} value={value}>
											{value.replaceAll("_", " ")}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							{["BALANCE_THRESHOLD", "LIABILITY_AGE"].includes(kind) ? (
								<Input
									value={threshold}
									onChange={(event) => setThreshold(event.target.value)}
									placeholder={
										kind === "BALANCE_THRESHOLD"
											? "Balance amount"
											: "Age in days"
									}
								/>
							) : (
								<div />
							)}
							<Input
								value={recipients}
								onChange={(event) => setRecipients(event.target.value)}
								placeholder="finance@example.com"
							/>
							<Button
								type="submit"
								className="sm:col-span-2"
								disabled={!name || !recipients || create.isPending}
							>
								Create alert rule
							</Button>
						</form>
						{rules.data?.map((rule) => (
							<div
								key={rule.id}
								className="flex items-center justify-between gap-3 rounded-xl border p-4"
							>
								<div>
									<p className="font-medium">{rule.name}</p>
									<p className="mt-1 text-xs text-muted-foreground">
										{rule.kind.replaceAll("_", " ")}
									</p>
								</div>
								<Button
									size="sm"
									variant="outline"
									disabled={updateRule.isPending}
									onClick={() =>
										updateRule.mutate({
											id: rule.id,
											enabled: !rule.enabled,
										})
									}
								>
									{rule.enabled ? "Pause" : "Enable"}
								</Button>
							</div>
						))}
					</TabsContent>
				</Tabs>
			</SheetContent>
		</Sheet>
	);
}
