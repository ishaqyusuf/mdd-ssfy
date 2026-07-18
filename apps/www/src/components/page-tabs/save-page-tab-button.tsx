"use client";

import { useAuth } from "@/hooks/use-auth";
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
import { Icons } from "@gnd/ui/icons";
import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";
import { useMutation, useQueryClient } from "@gnd/ui/tanstack";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@gnd/ui/tooltip";
import { toast } from "@gnd/ui/use-toast";
import { usePathname, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import type { FilterDefinition } from "../midday-search-filter/filter-definitions";
import { FilterList } from "../midday-search-filter/filter-list";
import { invalidatePageTabs } from "./invalidation";
import { normalizePagePath } from "./query-utils";

interface Props {
	definitions: FilterDefinition[];
	filters: Record<string, unknown>;
	optionLookup: Map<string, Map<string, string>>;
	buttonClassName?: string;
	query: string;
}

export function SavePageTabButton({
	definitions,
	filters,
	optionLookup,
	buttonClassName,
	query,
}: Props) {
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const auth = useAuth();
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [open, setOpen] = useState(false);
	const [title, setTitle] = useState("");
	const [setDefault, setSetDefault] = useState(false);
	const [generalTab, setGeneralTab] = useState(false);
	const page = normalizePagePath(pathname);
	const activeSortLabel = useMemo(
		() => getSortLabel(searchParams.get("sort")),
		[searchParams],
	);
	const isSuperAdmin = auth.roleTitle?.toLowerCase() === "super admin";

	const createTab = useMutation(
		trpc.pageTabs.create.mutationOptions({
			async onSuccess() {
				await invalidatePageTabs(queryClient, trpc, page);
				setOpen(false);
				setTitle("");
				setSetDefault(false);
				setGeneralTab(false);
				toast({
					title: "Page tab saved",
					variant: "success",
				});
			},
			onError(error) {
				toast({
					title: "Unable to save page tab",
					description: error.message,
					variant: "destructive",
				});
			},
		}),
	);

	if (!query) return null;

	return (
		<>
			<TooltipProvider delayDuration={120}>
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							aria-label="Save current view"
							className={cn(
								"h-8 w-8 shrink-0 rounded-md px-0",
								buttonClassName,
							)}
							onClick={() => setOpen(true)}
							size="sm"
							type="button"
							variant="outline"
						>
							<Icons.Plus className="size-4" />
						</Button>
					</TooltipTrigger>
					<TooltipContent className="px-2 py-1 text-xs" side="top">
						Save current view
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Save Filter Tab</DialogTitle>
						<DialogDescription>
							Save this filter and sort setup as a reusable tab for this page.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<FilterList
							filters={filters}
							definitions={definitions}
							optionLookup={optionLookup}
						/>
						{activeSortLabel ? (
							<div className="flex flex-wrap items-center gap-2 text-sm">
								<span className="text-muted-foreground">Sort</span>
								<Badge variant="secondary">{activeSortLabel}</Badge>
							</div>
						) : null}
						<div className="space-y-2">
							<Label htmlFor="page-tab-title">Filter name</Label>
							<Input
								id="page-tab-title"
								value={title}
								onChange={(event) => setTitle(event.target.value)}
								placeholder="My filter"
							/>
						</div>
						<div className="flex items-center gap-2 text-sm">
							<Checkbox
								id="page-tab-default"
								checked={setDefault}
								onCheckedChange={(checked) => setSetDefault(Boolean(checked))}
							/>
							<Label htmlFor="page-tab-default">Set as default</Label>
						</div>
						{isSuperAdmin ? (
							<div className="flex items-start gap-2 text-sm">
								<Checkbox
									id="page-tab-general"
									checked={generalTab}
									onCheckedChange={(checked) => setGeneralTab(Boolean(checked))}
								/>
								<div className="grid gap-0.5">
									<Label htmlFor="page-tab-general">General tab</Label>
									<p className="text-xs text-muted-foreground">
										Visible to all other users
									</p>
								</div>
							</div>
						) : null}
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setOpen(false)}
						>
							Cancel
						</Button>
						<Button
							type="button"
							disabled={!title.trim() || createTab.isPending}
							onClick={() => {
								createTab.mutate({
									page,
									query,
									title: title.trim(),
									setDefault,
									visibility: isSuperAdmin && generalTab ? "public" : "private",
								});
							}}
						>
							Save
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}

function getSortLabel(sort: string | null) {
	if (!sort) return null;

	const [field, direction] = sort.split(".");
	const fieldLabel = SORT_FIELD_LABELS[field] ?? field;
	const directionLabel =
		direction === "asc"
			? "ascending"
			: direction === "desc"
				? "descending"
				: null;

	return directionLabel ? `${fieldLabel}, ${directionLabel}` : fieldLabel;
}

const SORT_FIELD_LABELS: Record<string, string> = {
	amountDue: "Balance",
	createdAt: "Date",
	date: "Date",
	latestPaymentAt: "Latest payment",
	lotBlock: "Lot / block",
	orderId: "Order",
	project: "Project",
};
