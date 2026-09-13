"use client";

import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@gnd/ui/dialog";
import { Input } from "@gnd/ui/input";
import { Switch } from "@gnd/ui/switch";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import { useMemo, useState } from "react";

export type AssistantAccessPreviewRow = {
	id: number;
	name: string | null;
	email: string;
	accessRevokedAt: Date | null;
	assistantEntitlement: {
		enabled: boolean;
		expiresAt: Date | null;
		reason: string | null;
		version: number;
		updatedAt: Date;
		updatedByUserId: number;
		events: Array<{
			id: string;
			type: string;
			enabled: boolean;
			expiresAt: Date | null;
			reason: string | null;
			actorUserId: number | null;
			entitlementVersion: number;
			createdAt: Date;
		}>;
	} | null;
};

export function AssistantAccessSettingsPage({
	previewRows,
}: {
	previewRows?: AssistantAccessPreviewRow[];
}) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [search, setSearch] = useState("");
	const [selected, setSelected] = useState<AssistantAccessPreviewRow | null>(
		null,
	);
	const [nextEnabled, setNextEnabled] = useState(false);
	const [expiresAt, setExpiresAt] = useState("");
	const [reason, setReason] = useState("");
	const query = useQuery({
		...trpc.assistant.adminEntitlements.queryOptions({ take: 100 }),
		enabled: !previewRows,
	});
	const rows = (previewRows ?? query.data ?? []) as AssistantAccessPreviewRow[];
	const filtered = useMemo(() => {
		const term = search.trim().toLowerCase();
		if (!term) return rows;
		return rows.filter((row) =>
			[row.name, row.email].some((value) =>
				value?.toLowerCase().includes(term),
			),
		);
	}, [rows, search]);
	const enabledCount = rows.filter(
		(row) => row.assistantEntitlement?.enabled && !row.accessRevokedAt,
	).length;
	const expiringCount = rows.filter(
		(row) => row.assistantEntitlement?.expiresAt,
	).length;
	const update = useMutation(
		trpc.assistant.updateEntitlement.mutationOptions({
			async onSuccess() {
				await queryClient.invalidateQueries({
					queryKey: trpc.assistant.adminEntitlements.queryKey(),
				});
				setSelected(null);
				toast({ title: "Assistant access updated", variant: "success" });
			},
			onError(error) {
				toast({
					title: "Unable to update Assistant access",
					description: error.message,
					variant: "destructive",
				});
			},
		}),
	);

	function openEditor(row: AssistantAccessPreviewRow, enabled: boolean) {
		setSelected(row);
		setNextEnabled(enabled);
		setExpiresAt(
			row.assistantEntitlement?.expiresAt
				? toLocalDateTime(row.assistantEntitlement.expiresAt)
				: "",
		);
		setReason("");
	}

	return (
		<div className="space-y-4">
			<div className="grid gap-3 sm:grid-cols-3">
				<Summary
					label="Enabled accounts"
					value={enabledCount}
					detail="Individual access only"
				/>
				<Summary
					label="Scheduled expiry"
					value={expiringCount}
					detail="Temporary pilot access"
				/>
				<Summary
					label="Accounts shown"
					value={rows.length}
					detail="No role-based inheritance"
				/>
			</div>
			<section className="overflow-hidden rounded-lg border bg-background">
				<div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
					<div>
						<h2 className="font-semibold">Assistant access</h2>
						<p className="text-sm text-muted-foreground">
							Enable chat for individual employee accounts. Business permissions
							stay unchanged.
						</p>
					</div>
					<Input
						className="h-9 w-full sm:w-64"
						placeholder="Search employees"
						value={search}
						onChange={(event) => setSearch(event.target.value)}
					/>
				</div>
				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead className="bg-muted/40 text-left text-xs text-muted-foreground">
							<tr>
								<th className="px-4 py-3 font-medium">Employee</th>
								<th className="px-4 py-3 font-medium">Status</th>
								<th className="px-4 py-3 font-medium">Expires</th>
								<th className="px-4 py-3 font-medium">Last change</th>
								<th className="px-4 py-3 text-right font-medium">Access</th>
							</tr>
						</thead>
						<tbody className="divide-y">
							{filtered.map((row) => {
								const active = Boolean(
									row.assistantEntitlement?.enabled && !row.accessRevokedAt,
								);
								return (
									<tr key={row.id} className="hover:bg-muted/20">
										<td className="px-4 py-3">
											<p className="font-medium">
												{row.name || "Unnamed employee"}
											</p>
											<p className="text-xs text-muted-foreground">
												{row.email}
											</p>
										</td>
										<td className="px-4 py-3">
											<Badge variant={active ? "default" : "secondary"}>
												{row.accessRevokedAt
													? "Account revoked"
													: active
														? "Enabled"
														: "Disabled"}
											</Badge>
										</td>
										<td className="px-4 py-3 text-muted-foreground">
											{row.assistantEntitlement?.expiresAt
												? formatDate(row.assistantEntitlement.expiresAt)
												: "No expiry"}
										</td>
										<td className="max-w-64 px-4 py-3">
											<p className="truncate text-muted-foreground">
												{row.assistantEntitlement?.reason ||
													"No access decision yet"}
											</p>
											<p className="text-xs text-muted-foreground">
												{row.assistantEntitlement
													? formatDate(row.assistantEntitlement.updatedAt)
													: "—"}
											</p>
										</td>
										<td className="px-4 py-3 text-right">
											<Switch
												aria-label={`Assistant access for ${row.name || row.email}`}
												checked={active}
												disabled={
													Boolean(row.accessRevokedAt) ||
													update.isPending ||
													Boolean(previewRows)
												}
												onCheckedChange={(checked) => openEditor(row, checked)}
											/>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
				{query.isError ? (
					<p className="border-t p-4 text-sm text-destructive">
						Access records could not be loaded.
					</p>
				) : null}
			</section>

			<Dialog
				open={Boolean(selected)}
				onOpenChange={(open) => !open && setSelected(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							{nextEnabled ? "Enable" : "Disable"} Assistant access
						</DialogTitle>
						<DialogDescription>
							This changes product access for{" "}
							{selected?.name || selected?.email}. Existing business permissions
							are not changed.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-2">
						{nextEnabled ? (
							<label
								className="grid gap-2 text-sm"
								htmlFor="assistant-access-expiry"
							>
								<span className="font-medium">Expiry (optional)</span>
								<Input
									id="assistant-access-expiry"
									type="datetime-local"
									value={expiresAt}
									onChange={(event) => setExpiresAt(event.target.value)}
								/>
							</label>
						) : null}
						<label
							className="grid gap-2 text-sm"
							htmlFor="assistant-access-reason"
						>
							<span className="font-medium">Reason</span>
							<Input
								id="assistant-access-reason"
								placeholder="Required for the audit history"
								value={reason}
								onChange={(event) => setReason(event.target.value)}
							/>
						</label>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setSelected(null)}>
							Cancel
						</Button>
						<Button
							disabled={reason.trim().length < 3 || update.isPending}
							onClick={() =>
								selected &&
								update.mutate({
									userId: selected.id,
									enabled: nextEnabled,
									expiresAt: expiresAt ? new Date(expiresAt) : null,
									reason: reason.trim(),
									expectedVersion: selected.assistantEntitlement?.version ?? 0,
								})
							}
						>
							Save access
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

function Summary({
	label,
	value,
	detail,
}: { label: string; value: number; detail: string }) {
	return (
		<div className="rounded-lg border bg-background p-4">
			<p className="text-sm text-muted-foreground">{label}</p>
			<p className="mt-2 text-3xl font-semibold">{value}</p>
			<p className="mt-1 text-xs text-muted-foreground">{detail}</p>
		</div>
	);
}

function formatDate(value: Date) {
	return new Intl.DateTimeFormat("en-US", {
		dateStyle: "medium",
		timeStyle: "short",
		timeZone: "UTC",
	}).format(new Date(value));
}
function toLocalDateTime(value: Date) {
	const date = new Date(value);
	return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
		.toISOString()
		.slice(0, 16);
}
