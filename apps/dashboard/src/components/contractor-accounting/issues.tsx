"use client";

import { useContractorAccountingFilterParams } from "@/hooks/use-contractor-accounting-filter-params";
import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@gnd/ui/table";
import { useSuspenseQuery } from "@gnd/ui/tanstack";
import { Eye } from "lucide-react";

type Issue =
	RouterOutputs["contractorAccounting"]["resolutionIssues"]["data"][number];

function titleCase(value: string) {
	return value
		.replaceAll("_", " ")
		.toLowerCase()
		.replace(/\b\w/g, (character) => character.toUpperCase());
}

export function ContractorIssuesWorkspace({
	mode,
}: {
	mode: "review" | "resolution";
}) {
	const trpc = useTRPC();
	const { params, setParams } = useContractorAccountingFilterParams();
	const statuses =
		mode === "review"
			? (["OPEN", "REVIEWED"] as const)
			: (["OPEN", "REVIEWED", "RESOLVED"] as const);
	const { data } = useSuspenseQuery(
		trpc.contractorAccounting.resolutionIssues.queryOptions({
			statuses: [...statuses],
			contractorIds: params.contractorIds ?? undefined,
			pageSize: 100,
		}),
	);
	const rows = data.data.filter((issue) => {
		if (mode === "review") {
			return ["unreviewed", "in_progress", "stale"].includes(
				issue.resolutionStatus,
			);
		}
		return true;
	});

	return (
		<div className="overflow-hidden rounded-xl border">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Issue</TableHead>
						<TableHead>Contractor</TableHead>
						<TableHead>Period</TableHead>
						<TableHead>Status</TableHead>
						<TableHead className="text-right">Difference</TableHead>
						<TableHead className="w-20 text-right">Open</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{rows.map((issue) => (
						<IssueRow
							key={issue.id}
							issue={issue}
							onOpen={() => void setParams({ issueId: issue.id })}
						/>
					))}
					{!rows.length ? (
						<TableRow>
							<TableCell colSpan={6} className="h-64 text-center">
								{mode === "review"
									? "The review queue is clear."
									: "No reconciliation issues match this view."}
							</TableCell>
						</TableRow>
					) : null}
				</TableBody>
			</Table>
		</div>
	);
}

function IssueRow({ issue, onOpen }: { issue: Issue; onOpen: () => void }) {
	return (
		<TableRow>
			<TableCell>
				<p className="font-medium">{titleCase(issue.code)}</p>
				<p className="mt-1 max-w-[420px] truncate text-xs text-muted-foreground">
					{issue.message}
				</p>
			</TableCell>
			<TableCell>
				{issue.contractor?.name ||
					(issue.contractorId
						? `Contractor #${issue.contractorId}`
						: "All contractors")}
			</TableCell>
			<TableCell className="text-sm">
				{new Date(issue.run.from).toLocaleDateString()} –{" "}
				{new Date(issue.run.toExclusive).toLocaleDateString()}
			</TableCell>
			<TableCell>
				<Badge
					variant={
						issue.resolutionStatus === "resolved" ? "secondary" : "outline"
					}
				>
					{titleCase(issue.resolutionStatus)}
				</Badge>
			</TableCell>
			<TableCell className="text-right font-mono">
				{issue.differenceAmount?.toString() ?? "—"}
			</TableCell>
			<TableCell className="text-right">
				<Button
					size="icon"
					variant="ghost"
					aria-label={`Open ${titleCase(issue.code)} issue`}
					onClick={onOpen}
				>
					<Eye className="size-4" />
				</Button>
			</TableCell>
		</TableRow>
	);
}
