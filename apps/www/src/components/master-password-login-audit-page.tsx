"use client";

import { ErrorFallback } from "@/components/error-fallback";
import { MasterPasswordLoginsColumnVisibility } from "@/components/tables-2/master-password-logins/column-visibility";
import type { MasterPasswordLoginRow } from "@/components/tables-2/master-password-logins/columns";
import {
	DataTable,
	type PageInfo as MasterPasswordLoginPageInfo,
} from "@/components/tables-2/master-password-logins/data-table";
import { MasterPasswordLoginsSkeleton } from "@/components/tables-2/master-password-logins/skeleton";
import { useTRPC } from "@/trpc/client";
import type { TableSettings } from "@/utils/table-settings";
import type { RouterInputs } from "@api/trpc/routers/_app";
import { Button } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
import { Icons } from "@gnd/ui/icons";
import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";
import { AlertDialog } from "@gnd/ui/namespace";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@gnd/ui/select";
import { toast } from "@gnd/ui/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense, useMemo, useState } from "react";

type ListInput = NonNullable<RouterInputs["masterPasswordLoginAudits"]["list"]>;
type PlatformFilter = "ALL" | "WEBSITE" | "MOBILE" | "UNKNOWN";
type UsageFilter = "ALL" | "LOGIN" | "SALES_REP_TRANSFER";

const platforms: Array<{ value: PlatformFilter; label: string }> = [
	{ value: "ALL", label: "All platforms" },
	{ value: "WEBSITE", label: "Website" },
	{ value: "MOBILE", label: "Mobile" },
	{ value: "UNKNOWN", label: "Unknown" },
];

const usageTypes: Array<{ value: UsageFilter; label: string }> = [
	{ value: "ALL", label: "All usage" },
	{ value: "LOGIN", label: "Login" },
	{ value: "SALES_REP_TRANSFER", label: "Sales rep transfer" },
];

type Props = {
	initialSettings?: Partial<TableSettings>;
};

type ClearConfirmation =
	| {
			type: "filtered";
			total: number;
	  }
	| {
			type: "row";
			row: MasterPasswordLoginRow;
	  };

export function MasterPasswordLoginAuditPage({ initialSettings }: Props) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [search, setSearch] = useState("");
	const [platform, setPlatform] = useState<PlatformFilter>("ALL");
	const [usageType, setUsageType] = useState<UsageFilter>("ALL");
	const [showCleared, setShowCleared] = useState(false);
	const [page, setPage] = useState(1);
	const [pageInfo, setPageInfo] = useState<MasterPasswordLoginPageInfo | null>(
		null,
	);
	const [clearConfirmation, setClearConfirmation] =
		useState<ClearConfirmation | null>(null);
	const size = 25;

	const filters = useMemo(
		() =>
			({
				q: search.trim() || undefined,
				platform: platform === "ALL" ? undefined : platform,
				usageType: usageType === "ALL" ? undefined : usageType,
				includeCleared: showCleared || undefined,
				page,
				size,
			}) satisfies ListInput,
		[page, platform, search, showCleared, usageType],
	);
	const hasFilters =
		Boolean(search.trim()) ||
		platform !== "ALL" ||
		usageType !== "ALL" ||
		showCleared;

	const refresh = async () => {
		await queryClient.invalidateQueries({
			queryKey: trpc.masterPasswordLoginAudits.list.pathKey(),
		});
	};

	const clearMutation = useMutation(
		trpc.masterPasswordLoginAudits.clear.mutationOptions({
			async onSuccess(result) {
				await refresh();
				toast({
					title: "Master password usage records cleared",
					description: `${result.count.toLocaleString()} record${
						result.count === 1 ? "" : "s"
					} archived.`,
					variant: "success",
				});
			},
			onError(error) {
				toast({
					title: "Unable to clear records",
					description: error.message,
					variant: "destructive",
				});
			},
		}),
	);

	const clearFilteredRecords = () => {
		const total = pageInfo?.total ?? 0;
		if (!total) return;

		setClearConfirmation({ type: "filtered", total });
	};

	const clearSingleRecord = (row: MasterPasswordLoginRow) => {
		if (row.clearedAt) return;

		setClearConfirmation({ type: "row", row });
	};

	const confirmClear = () => {
		if (!clearConfirmation) return;

		if (clearConfirmation.type === "row") {
			clearMutation.mutate({ ids: [clearConfirmation.row.id] });
		} else {
			clearMutation.mutate({
				q: search.trim() || undefined,
				platform: platform === "ALL" ? undefined : platform,
				usageType: usageType === "ALL" ? undefined : usageType,
			});
		}

		setClearConfirmation(null);
	};

	const clearFilters = () => {
		setSearch("");
		setPlatform("ALL");
		setUsageType("ALL");
		setShowCleared(false);
		setPage(1);
	};

	const clearVariables = clearMutation.variables;
	const pendingClearIds =
		typeof clearVariables === "object" && clearVariables
			? clearVariables.ids
			: undefined;
	const clearingRowId =
		clearMutation.isPending && pendingClearIds?.length === 1
			? pendingClearIds[0]
			: null;

	return (
		<div className="flex min-w-0 flex-col gap-4">
			<div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
				<div className="grid gap-3 md:grid-cols-[minmax(240px,1fr)_180px_190px_auto] lg:flex-1">
					<div className="grid gap-1.5">
						<Label htmlFor="master-password-login-search">Search</Label>
						<div className="relative">
							<Icons.Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								id="master-password-login-search"
								value={search}
								onChange={(event) => {
									setSearch(event.target.value);
									setPage(1);
								}}
								placeholder="User, usage, sale number, country, IP, browser, or reference"
								className="pl-9"
							/>
						</div>
					</div>
					<div className="grid gap-1.5">
						<Label>Usage</Label>
						<Select
							value={usageType}
							onValueChange={(value) => {
								setUsageType(value as UsageFilter);
								setPage(1);
							}}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{usageTypes.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="grid gap-1.5">
						<Label>Platform</Label>
						<Select
							value={platform}
							onValueChange={(value) => {
								setPlatform(value as PlatformFilter);
								setPage(1);
							}}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{platforms.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="flex items-end">
						<div className="flex h-10 items-center gap-2 text-sm text-muted-foreground">
							<Checkbox
								id="show-cleared-master-password-logins"
								checked={showCleared}
								onCheckedChange={(checked) => {
									setShowCleared(checked === true);
									setPage(1);
								}}
							/>
							<Label
								htmlFor="show-cleared-master-password-logins"
								className="font-normal"
							>
								Show cleared
							</Label>
						</div>
					</div>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<MasterPasswordLoginsColumnVisibility />
					<Button
						type="button"
						variant="outline"
						onClick={() => void refresh()}
						disabled={pageInfo?.isFetching}
					>
						{pageInfo?.isFetching ? (
							<Icons.Loader2 className="mr-2 size-4 animate-spin" />
						) : (
							<Icons.RefreshCw className="mr-2 size-4" />
						)}
						Refresh
					</Button>
					<Button
						type="button"
						variant="destructive"
						onClick={clearFilteredRecords}
						disabled={
							!(pageInfo?.total ?? 0) || clearMutation.isPending || showCleared
						}
					>
						{clearMutation.isPending && !clearingRowId ? (
							<Icons.Loader2 className="mr-2 size-4 animate-spin" />
						) : (
							<Icons.Trash2 className="mr-2 size-4" />
						)}
						Clear
					</Button>
				</div>
			</div>

			<ErrorBoundary errorComponent={ErrorFallback}>
				<Suspense
					fallback={
						<MasterPasswordLoginsSkeleton initialSettings={initialSettings} />
					}
				>
					<DataTable
						initialSettings={initialSettings}
						filters={filters}
						hasFilters={hasFilters}
						clearingRowId={clearingRowId}
						onClearFilters={clearFilters}
						onClearRecord={clearSingleRecord}
						onPageInfoChange={setPageInfo}
					/>
				</Suspense>
			</ErrorBoundary>

			<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
				<p className="text-sm text-muted-foreground">
					{pageInfo
						? `${pageInfo.total.toLocaleString()} record${
								pageInfo.total === 1 ? "" : "s"
							} • Page ${pageInfo.page} of ${pageInfo.pageCount}`
						: "Loading master password usage records"}
				</p>
				<div className="flex items-center gap-2">
					<Button
						type="button"
						variant="outline"
						size="sm"
						disabled={page <= 1 || pageInfo?.isFetching}
						onClick={() => setPage((value) => Math.max(1, value - 1))}
					>
						Previous
					</Button>
					<Button
						type="button"
						variant="outline"
						size="sm"
						disabled={
							Boolean(pageInfo && page >= pageInfo.pageCount) ||
							pageInfo?.isFetching
						}
						onClick={() =>
							setPage((value) =>
								Math.min(pageInfo?.pageCount ?? value, value + 1),
							)
						}
					>
						Next
					</Button>
				</div>
			</div>

			<AlertDialog
				open={clearConfirmation !== null}
				onOpenChange={(open) => {
					if (!open) setClearConfirmation(null);
				}}
			>
				<AlertDialog.Content>
					<AlertDialog.Header>
						<AlertDialog.Title>
							Clear master password usage{" "}
							{clearConfirmation?.type === "filtered" ? "records" : "record"}?
						</AlertDialog.Title>
						<AlertDialog.Description>
							{clearConfirmation?.type === "filtered"
								? `${clearConfirmation.total.toLocaleString()} active record${
										clearConfirmation.total === 1 ? "" : "s"
									} matching the current filters will be archived and hidden from the default view.`
								: `The record for ${
										clearConfirmation?.row.targetUser?.name ||
										clearConfirmation?.row.targetUserName ||
										clearConfirmation?.row.targetUserEmail ||
										"this user"
									} will be archived and hidden from the default view.`}
						</AlertDialog.Description>
					</AlertDialog.Header>
					<AlertDialog.Footer>
						<AlertDialog.Cancel disabled={clearMutation.isPending}>
							Cancel
						</AlertDialog.Cancel>
						<AlertDialog.Action
							disabled={clearMutation.isPending}
							onClick={confirmClear}
						>
							Clear record
							{clearConfirmation?.type === "filtered" &&
							clearConfirmation.total !== 1
								? "s"
								: ""}
						</AlertDialog.Action>
					</AlertDialog.Footer>
				</AlertDialog.Content>
			</AlertDialog>
		</div>
	);
}
