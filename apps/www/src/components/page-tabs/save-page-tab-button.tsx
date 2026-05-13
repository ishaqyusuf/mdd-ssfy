"use client";

import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
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
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import { usePathname, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import type { FilterDefinition } from "../midday-search-filter/filter-definitions";
import { FilterList } from "../midday-search-filter/filter-list";
import { invalidatePageTabs } from "./page-tabs";
import { normalizePagePath, queryFromActiveFilters } from "./query-utils";

interface Props {
	definitions: FilterDefinition[];
	filters: Record<string, unknown>;
	optionLookup: Map<string, Map<string, string>>;
}

export function SavePageTabButton({
	definitions,
	filters,
	optionLookup,
}: Props) {
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [open, setOpen] = useState(false);
	const [title, setTitle] = useState("");
	const [setDefault, setSetDefault] = useState(false);
	const page = normalizePagePath(pathname);
	const query = useMemo(
		() => queryFromActiveFilters(searchParams, filters),
		[searchParams, filters],
	);
	const { data: tabs } = useQuery(trpc.pageTabs.list.queryOptions({ page }));
	const isAlreadySaved = tabs?.some((tab) => tab.query === query);
	const canSave = Boolean(query) && !isAlreadySaved;

	const createTab = useMutation(
		trpc.pageTabs.create.mutationOptions({
			async onSuccess() {
				await invalidatePageTabs(queryClient, trpc, page);
				setOpen(false);
				setTitle("");
				setSetDefault(false);
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

	if (!canSave) return null;

	return (
		<>
			<Button
				aria-label="Save current filters as page tab"
				className="h-8 w-8 shrink-0 rounded-md px-0"
				onClick={() => setOpen(true)}
				size="sm"
				type="button"
				variant="outline"
			>
				<Icons.Plus className="size-4" />
			</Button>
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Save Filter Tab</DialogTitle>
						<DialogDescription>
							Save this filter set as a private tab for this page.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<FilterList
							filters={filters}
							definitions={definitions}
							optionLookup={optionLookup}
						/>
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
