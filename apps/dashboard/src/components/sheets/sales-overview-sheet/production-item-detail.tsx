import Note from "@/modules/notes";
import { noteTagFilter } from "@/modules/notes/utils";
import { useState } from "react";

import { Badge } from "@gnd/ui/badge";
import { cn } from "@gnd/ui/cn";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@gnd/ui/tabs";

import { ProductionItemAssignments } from "./production-assignments";
import { useProductionItem } from "./production-item-context";
import { getWorkerProductionSubmissionProgress } from "./production-worker-policy";
import { getProductionConfigKey } from "./production/v2/production-item-presentation";

export function ProductionItemDetail() {
	const ctx = useProductionItem();
	const { queryCtx } = ctx;
	const workerMode = Boolean(queryCtx.assignedTo);
	const tabIsAvailable = (tab?: string | null) =>
		workerMode
			? tab === "details" || tab === "notes" || tab === "submissions"
			: tab === "details" || tab === "notes" || tab === "assignments";
	const requestedTab = queryCtx.params["prod-item-tab"];
	const initialTab =
		queryCtx.params["prod-item-view"] === ctx.item.controlUid &&
		tabIsAvailable(requestedTab)
			? requestedTab
			: "details";
	const [selectedTab, setSelectedTab] = useState(initialTab);
	const activeTab = tabIsAvailable(selectedTab) ? selectedTab : "details";
	const submissionProgress = getWorkerProductionSubmissionProgress(ctx.item);

	return (
		<Tabs
			value={activeTab}
			onValueChange={(tab) => {
				setSelectedTab(tab);
				queryCtx.setParams({
					"prod-item-view": ctx.item.controlUid,
					"prod-item-tab": tab,
				});
			}}
			defaultValue="details"
			className="w-full"
		>
			<TabsList
				aria-label="Production item tabs"
				className="h-auto w-fit max-w-full flex-wrap justify-start gap-1 rounded-md border border-border bg-muted/40 p-1"
			>
				<TabsTrigger
					value="details"
					className={productionItemTabClassName(activeTab === "details")}
				>
					Details
				</TabsTrigger>
				<TabsTrigger
					value="notes"
					className={productionItemTabClassName(activeTab === "notes")}
				>
					Notes
				</TabsTrigger>
				{workerMode ? (
					<TabsTrigger
						value="submissions"
						className={productionItemTabClassName(activeTab === "submissions")}
					>
						<span>Submissions</span>
						<Badge
							className={cn(
								"ml-1.5 h-4 px-1.5 text-[10px] leading-none",
								activeTab === "submissions" &&
									"bg-background/15 text-background",
							)}
							variant={submissionProgress.submitted ? "default" : "outline"}
						>
							{submissionProgress.submitted}/{submissionProgress.assigned}
						</Badge>
					</TabsTrigger>
				) : (
					<TabsTrigger
						value="assignments"
						className={productionItemTabClassName(activeTab === "assignments")}
					>
						Assignments
					</TabsTrigger>
				)}
			</TabsList>
			<TabsContent value="details" className="mt-4 space-y-4">
				<Details />
			</TabsContent>
			<TabsContent value="notes" className="mt-4 space-y-4">
				<Note
					subject="Production Note"
					headline=""
					statusFilters={["public"]}
					typeFilters={["production", "general"]}
					tagFilters={[
						noteTagFilter("itemControlUID", ctx.item.controlUid),
						noteTagFilter("salesItemId", ctx.item.itemId),
						noteTagFilter("salesId", ctx.item.salesId),
					]}
				/>
			</TabsContent>
			{workerMode ? (
				<TabsContent value="submissions" className="mt-4 space-y-4">
					<ProductionItemAssignments view="submissions" />
				</TabsContent>
			) : (
				<TabsContent value="assignments" className="mt-4 space-y-4">
					<ProductionItemAssignments />
				</TabsContent>
			)}
		</Tabs>
	);
}

function productionItemTabClassName(active: boolean) {
	return cn(
		"h-8 min-h-8 rounded-sm px-3 text-xs uppercase data-[state=active]:translate-y-0",
		active
			? "bg-foreground text-background shadow-sm hover:bg-foreground/90"
			: "text-muted-foreground hover:bg-background hover:text-foreground",
	);
}

function Details() {
	const ctx = useProductionItem();
	return (
		<div className="grid grid-cols-2 gap-3 px-6">
			{ctx.item.configs
				?.filter((config) => !config.hidden)
				.map((config, index) => (
					<div
						key={getProductionConfigKey(config, index)}
						className="space-y-1"
					>
						<p className="text-xs font-medium uppercase text-muted-foreground">
							{config.label}:
						</p>
						<p
							className={cn(
								"text-sm font-medium uppercase",
								config.color === "red" && "text-red-600",
							)}
						>
							{config.value}
						</p>
					</div>
				))}
		</div>
	);
}
