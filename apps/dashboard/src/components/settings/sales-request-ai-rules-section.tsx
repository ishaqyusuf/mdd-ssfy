"use client";

import { useTRPC } from "@/trpc/client";
import type { SalesRequestAIRule } from "@gnd/settings";
import { Button } from "@gnd/ui/button";
import { Field, FieldGroup, FieldLabel } from "@gnd/ui/field";
import { Input } from "@gnd/ui/input";
import { Switch } from "@gnd/ui/switch";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { Textarea } from "@gnd/ui/textarea";
import { toast } from "@gnd/ui/use-toast";
import { useState } from "react";
import { SettingsCard } from "./settings-card";
import { SettingsQueryError } from "./settings-query-error";

export function SalesRequestAIRulesSection() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const query = useQuery(trpc.salesRequest.getAIRules.queryOptions());
	const [draft, setDraft] = useState<{
		revision: number;
		rules: SalesRequestAIRule[];
	} | null>(null);
	const rules = draft?.rules ?? query.data?.rules ?? [];
	const save = useMutation(
		trpc.salesRequest.updateAIRules.mutationOptions({
			onSuccess(data) {
				queryClient.setQueryData(trpc.salesRequest.getAIRules.queryKey(), data);
				setDraft(null);
				toast({ variant: "success", title: "Sales request rules saved" });
			},
			onError(error) {
				toast({
					variant: "destructive",
					title: "Unable to save rules",
					description: error.message,
				});
			},
		}),
	);
	const change = (next: SalesRequestAIRule[]) =>
		setDraft({
			revision: draft?.revision ?? query.data?.revision ?? 0,
			rules: next,
		});
	const patch = (id: string, values: Partial<SalesRequestAIRule>) =>
		change(
			rules.map((rule) => (rule.id === id ? { ...rule, ...values } : rule)),
		);
	const total = rules.reduce(
		(sum, rule) =>
			sum + rule.title.trim().length + rule.instruction.trim().length,
		0,
	);
	if (query.isError)
		return (
			<SettingsQueryError
				title="Unable to load AI rules"
				description={query.error.message}
				onRetry={() => void query.refetch()}
			/>
		);
	return (
		<SettingsCard
			title="Sales request rules"
			description="Enabled rules guide every new sales AI request. Explicit customer instructions and product validation still apply."
			footer={
				<div className="flex flex-wrap items-center justify-between gap-3">
					<p className="text-xs text-muted-foreground">
						{rules.length}/30 rules · {total.toLocaleString()}/12,000 characters
					</p>
					<div className="flex gap-2">
						<Button
							type="button"
							variant="outline"
							disabled={!draft || save.isPending}
							onClick={() => setDraft(null)}
						>
							Discard rule changes
						</Button>
						<Button
							type="button"
							disabled={
								!draft ||
								save.isPending ||
								total > 12000 ||
								rules.some(
									(rule) => !rule.title.trim() || !rule.instruction.trim(),
								)
							}
							onClick={() =>
								draft &&
								save.mutate({ expectedRevision: draft.revision, rules })
							}
						>
							{save.isPending ? "Saving rules…" : "Save rules"}
						</Button>
					</div>
				</div>
			}
		>
			<div className="flex flex-col gap-5">
				{query.isPending ? (
					<output>Loading rules…</output>
				) : (
					<>
						{!rules.length && (
							<p className="text-sm text-muted-foreground">
								No rules yet. Add guidance that applies to all sales requests.
							</p>
						)}
						{rules.map((rule, index) => (
							<FieldGroup key={rule.id} className="rounded-md border p-4">
								<Field>
									<FieldLabel htmlFor={`rule-title-${rule.id}`}>
										Rule {index + 1} title
									</FieldLabel>
									<Input
										id={`rule-title-${rule.id}`}
										value={rule.title}
										maxLength={100}
										disabled={save.isPending}
										onChange={(event) =>
											patch(rule.id, { title: event.target.value })
										}
									/>
								</Field>
								<Field>
									<FieldLabel htmlFor={`rule-instruction-${rule.id}`}>
										Instruction
									</FieldLabel>
									<Textarea
										id={`rule-instruction-${rule.id}`}
										value={rule.instruction}
										maxLength={1000}
										disabled={save.isPending}
										onChange={(event) =>
											patch(rule.id, { instruction: event.target.value })
										}
									/>
								</Field>
								<div className="flex items-center justify-between gap-3">
									<Field orientation="horizontal">
										<Switch
											id={`rule-enabled-${rule.id}`}
											checked={rule.enabled}
											disabled={save.isPending}
											onCheckedChange={(enabled) => patch(rule.id, { enabled })}
										/>
										<FieldLabel htmlFor={`rule-enabled-${rule.id}`}>
											Enabled
										</FieldLabel>
									</Field>
									<Button
										type="button"
										variant="ghost"
										disabled={save.isPending}
										aria-label={`Delete rule ${index + 1}`}
										onClick={() =>
											change(rules.filter((item) => item.id !== rule.id))
										}
									>
										Delete
									</Button>
								</div>
							</FieldGroup>
						))}
						<Button
							type="button"
							variant="outline"
							className="self-start"
							disabled={save.isPending || rules.length >= 30}
							onClick={() =>
								change([
									...rules,
									{
										id: crypto.randomUUID(),
										title: "",
										instruction: "",
										enabled: true,
									},
								])
							}
						>
							Add rule
						</Button>
					</>
				)}
			</div>
		</SettingsCard>
	);
}
