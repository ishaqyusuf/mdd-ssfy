"use client";

import { useAssistantDiagnosticParams } from "@/hooks/use-assistant-diagnostic-params";
import { useTRPC } from "@/trpc/client";
import {
	assistantDiagnosticFilterSchema,
	assistantDiagnosticStageSchema,
	type AssistantDiagnosticFilters,
} from "@api/assistant/diagnostic-contract";
import { assistantOutcomeKinds } from "@api/assistant/outcomes";
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
import { useQuery } from "@gnd/ui/tanstack";
import { useState } from "react";
import { AssistantDiagnosticUiGate } from "./assistant-diagnostic-ui-gate";
import { AssistantCaptureHealth } from "./assistant-capture-health";

export function AssistantDiagnostics() {
	return <AssistantDiagnosticUiGate><AssistantDiagnosticsInbox /></AssistantDiagnosticUiGate>;
}

function AssistantDiagnosticsInbox() {
	const trpc = useTRPC();
	const { setReference } = useAssistantDiagnosticParams();
	const [status, setStatus] = useState<
		"all" | "new" | "investigating" | "resolved"
	>("all");
	const [search, setSearch] = useState("");
	const [reference, setFilterReference] = useState<string | undefined>();
	const [cursors, setCursors] = useState<string[]>([]);
	const [filters, setFilters] = useState<AssistantDiagnosticFilters>({
		take: 20,
	});
	const [filterError, setFilterError] = useState<string | null>(null);
	const [filterReset, setFilterReset] = useState(0);
	const query = useQuery(
		trpc.assistant.diagnostics.queryOptions({
			...filters,
			take: 20,
			status: status === "all" ? undefined : status,
			reference,
			cursor: cursors.at(-1),
		}),
	);
	return (
		<section
			className="rounded-lg border bg-card"
			aria-labelledby="assistant-diagnostics-title"
		>
			<div className="border-b p-5">
				<h2 id="assistant-diagnostics-title" className="font-medium">
					Diagnostics
				</h2>
				<p className="mt-1 text-sm text-muted-foreground">
					Review assistant failures and track their resolution. Detailed records
					are kept for 30 days.
				</p>
			</div>
			<AssistantCaptureHealth />
			<form
				className="flex flex-wrap items-end gap-3 p-5"
				onSubmit={(event) => {
					event.preventDefault();
					const form = new FormData(event.currentTarget);
					const value = (key: string) => {
						const raw = String(form.get(key) ?? "").trim();
						return raw && raw !== "all" ? raw : undefined;
					};
					const parsed = assistantDiagnosticFilterSchema.safeParse({
						stage: value("stage"),
						outcome: value("outcome"),
						provider: value("provider"),
						model: value("model"),
						environment: value("environment"),
						from: value("from"),
						to: value("to"),
					});
					if (!parsed.success) {
						setFilterError(
							"Check the filters. The end date must follow the start date.",
						);
						return;
					}
					setFilterError(null);
					setFilters(parsed.data);
					setFilterReference(search.trim() || undefined);
					setCursors([]);
				}}
				onReset={() => {
					setSearch("");
					setFilterReference(undefined);
					setStatus("all");
					setFilters({ take: 20 });
					setCursors([]);
					setFilterError(null);
					setFilterReset((value) => value + 1);
				}}
			>
				<div className="space-y-2">
					<Label htmlFor="diagnostic-status">Status</Label>
					<Select
						value={status}
						onValueChange={(value) => {
							if (
								value === "all" ||
								value === "new" ||
								value === "investigating" ||
								value === "resolved"
							) {
								setStatus(value);
								setCursors([]);
							}
						}}
					>
						<SelectTrigger id="diagnostic-status" className="w-44">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{["all", "new", "investigating", "resolved"].map((value) => (
								<SelectItem key={value} value={value}>
									{value === "all"
										? "All statuses"
										: value.charAt(0).toUpperCase() + value.slice(1)}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div className="space-y-2">
					<Label htmlFor="diagnostic-reference">Reference</Label>
					<Input
						id="diagnostic-reference"
						value={search}
						onChange={(event) => setSearch(event.target.value.toUpperCase())}
						placeholder="ERR-…"
						pattern="ERR-[A-Z0-9]{10}"
						maxLength={14}
					/>
				</div>
				<details className="w-full">
					<summary className="cursor-pointer text-sm">More filters</summary>
					<div
						key={filterReset}
						className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
					>
						{[
							{
								name: "stage",
								label: "Failure stage",
								options: assistantDiagnosticStageSchema.options,
							},
							{
								name: "outcome",
								label: "Outcome category",
								options: assistantOutcomeKinds,
							},
							{
								name: "provider",
								label: "Provider",
								options: ["openai", "anthropic", "deepseek", "google"],
							},
						].map((field) => (
							<div className="space-y-2" key={field.name}>
								<Label htmlFor={`diagnostic-${field.name}`}>
									{field.label}
								</Label>
								<Select name={field.name} defaultValue="all">
									<SelectTrigger id={`diagnostic-${field.name}`}>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All</SelectItem>
										{field.options.map((option) => (
											<SelectItem key={option} value={option}>
												{option}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						))}
						{[
							{ name: "model", label: "Model", max: 100 },
							{ name: "environment", label: "Environment", max: 32 },
						].map((field) => (
							<div className="space-y-2" key={field.name}>
								<Label htmlFor={`diagnostic-${field.name}`}>
									{field.label}
								</Label>
								<Input
									id={`diagnostic-${field.name}`}
									name={field.name}
									maxLength={field.max}
								/>
							</div>
						))}
						{[
							{ name: "from", label: "From (local time)" },
							{ name: "to", label: "To (local time)" },
						].map((field) => (
							<div className="space-y-2" key={field.name}>
								<Label htmlFor={`diagnostic-${field.name}`}>
									{field.label}
								</Label>
								<Input
									id={`diagnostic-${field.name}`}
									name={field.name}
									type="datetime-local"
								/>
							</div>
						))}
					</div>
				</details>
				{filterError ? (
					<p role="alert" className="w-full text-sm">
						{filterError}
					</p>
				) : null}
				<Button type="submit" variant="outline">
					Apply
				</Button>
				<Button type="reset" variant="ghost">
					Clear filters
				</Button>
				<Button
					type="button"
					variant="ghost"
					onClick={() => void query.refetch()}
				>
					Refresh
				</Button>
			</form>
			{query.isPending ? (
				<p className="px-5 pb-5" role="status">
					Loading diagnostics…
				</p>
			) : query.isError ? (
				<p className="px-5 pb-5" role="alert">
					Unable to load diagnostics. Try refreshing.
				</p>
			) : query.data.items.length === 0 ? (
				<p className="px-5 pb-5 text-sm text-muted-foreground">
					No matching diagnostics.
				</p>
			) : (
				<div className="overflow-x-auto">
					<table className="w-full text-left text-sm">
						<thead className="border-y text-muted-foreground">
							<tr>
								{["Failure", "When", "Stage", "Status", "Occurrences"].map(
									(label) => (
										<th key={label} className="px-5 py-3 font-medium">
											{label}
										</th>
									),
								)}
							</tr>
						</thead>
						<tbody>
							{query.data.items.map((item) => (
								<tr key={item.reference} className="border-b last:border-0">
									<td className="px-5 py-3">
										<button
											type="button"
											className="text-left underline-offset-4 hover:underline focus-visible:underline"
											onClick={() => void setReference(item.reference)}
										>
											<span className="block font-medium">
												{item.publicMessage}
											</span>
											<span className="text-xs text-muted-foreground">
												{item.reference} · {item.provider ?? "Application"}
											</span>
										</button>
									</td>
									<td className="px-5 py-3 whitespace-nowrap">
										{new Date(item.createdAt).toLocaleString()}
									</td>
									<td className="px-5 py-3">{item.stage}</td>
									<td className="px-5 py-3">{item.status}</td>
									<td className="px-5 py-3">{item.occurrences}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
			<div className="flex justify-end gap-2 border-t p-5">
				<Button
					variant="outline"
					disabled={!cursors.length || query.isFetching}
					onClick={() => setCursors((values) => values.slice(0, -1))}
				>
					Previous
				</Button>
				<Button
					variant="outline"
					disabled={!query.data?.nextCursor || query.isFetching}
					onClick={() => {
						const next = query.data?.nextCursor;
						if (next) setCursors((values) => [...values, next]);
					}}
				>
					Next
				</Button>
			</div>
		</section>
	);
}
