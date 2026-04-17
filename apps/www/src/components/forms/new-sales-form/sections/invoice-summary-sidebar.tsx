"use client";

import dynamic from "next/dynamic";
import { Icons } from "@gnd/ui/icons";

import { useState } from "react";
import { Button } from "@gnd/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";
import { InvoiceOverviewPanel } from "./invoice-overview-panel";
import { useNewSalesFormStore } from "../store";

interface Props {
	mode: "create" | "edit";
	type: "order" | "quote";
	isSaved: boolean;
	isSaving?: boolean;
	mobileOpen: boolean;
	onClose: () => void;
	onSave: () => void;
	onSaveClose: () => void;
	onSaveNew: () => void;
	onSaveFinal: () => void;
}

const SalesHistory = dynamic(
	() => import("@/components/sales-hx").then((mod) => mod.SalesHistory),
	{
		loading: () => (
			<div className="space-y-3">
				<div className="h-10 w-full animate-pulse rounded bg-muted" />
				<div className="h-20 w-full animate-pulse rounded bg-muted" />
				<div className="h-20 w-full animate-pulse rounded bg-muted" />
			</div>
		),
	},
);

export function InvoiceSummarySidebar(props: Props) {
	const record = useNewSalesFormStore((s) => s.record);
	const [tab, setTab] = useState<"summary" | "history">("summary");

	return (
		<>
			{props.mobileOpen ? (
				<button
					type="button"
					aria-label="Close invoice summary"
					className="fixed inset-0 z-30 bg-background/70 backdrop-blur-[1px] xl:hidden"
					onClick={props.onClose}
				/>
			) : null}

			<aside
				className={`fixed inset-y-0 right-0 z-40 w-full max-w-[420px] border-l bg-card shadow-2xl transition-transform duration-300 xl:static xl:z-auto xl:flex xl:h-full xl:w-[420px] xl:max-w-none xl:translate-x-0 xl:border-l xl:shadow-none ${
					props.mobileOpen
						? "translate-x-0"
						: "translate-x-full xl:translate-x-0"
				}`}
			>
				<div className="flex h-full flex-col">
					<div className="flex items-center border-b px-4 py-3">
						<div className="flex items-center gap-2">
							<Icons.Building2 className="size-5 text-primary" />
							<h3 className="text-xl font-bold leading-tight tracking-tight text-foreground">
								Invoice Summary
							</h3>
						</div>
						<div className="ml-auto flex items-center gap-2">
							<div className="hidden items-center gap-1 rounded-lg border bg-muted/40 p-1 md:flex">
								<Button
									size="sm"
									variant={tab === "summary" ? "default" : "ghost"}
									className="h-7 px-2 text-xs"
									onClick={() => setTab("summary")}
								>
									Summary
								</Button>
								<Button
									size="sm"
									variant={tab === "history" ? "default" : "ghost"}
									className="h-7 px-2 text-xs"
									onClick={() => setTab("history")}
								>
									History
								</Button>
							</div>
							<Button
								size="icon"
								variant="ghost"
								className="xl:hidden"
								onClick={props.onClose}
							>
								<Icons.X className="size-4" />
							</Button>
						</div>
					</div>

					<div className="flex-1 overflow-auto p-4 pb-28">
						{tab === "summary" ? (
							<InvoiceOverviewPanel mode={props.mode} type={props.type} />
						) : (
							<SalesHistory salesId={record?.salesId} />
						)}
					</div>

					<div className="sticky bottom-0 border-t bg-card/95 px-4 py-3 backdrop-blur">
						<div className="flex items-center gap-2">
							<Button
								className="flex-1"
								onClick={props.onSave}
								disabled={props.isSaving}
							>
								{props.isSaving ? "Saving..." : "Save"}
							</Button>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										size="icon"
										variant="outline"
										disabled={props.isSaving}
									>
										<Icons.MoreHorizontal className="size-4" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuItem
										onSelect={(e) => {
											e.preventDefault();
											props.onSave();
										}}
										disabled={props.isSaving}
									>
										Save Draft
									</DropdownMenuItem>
									<DropdownMenuItem
										onSelect={(e) => {
											e.preventDefault();
											props.onSaveClose();
										}}
										disabled={props.isSaving}
									>
										Save & Close
									</DropdownMenuItem>
									<DropdownMenuItem
										onSelect={(e) => {
											e.preventDefault();
											props.onSaveNew();
										}}
										disabled={props.isSaving}
									>
										Save & New
									</DropdownMenuItem>
									<DropdownMenuItem
										onSelect={(e) => {
											e.preventDefault();
											props.onSaveFinal();
										}}
										disabled={props.isSaving}
									>
										Save Final
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
						<p className="mt-2 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
							{props.isSaved && record?.orderId
								? `Saved as ${record.orderId}`
								: "Unsaved draft"}
						</p>
					</div>
				</div>
			</aside>
		</>
	);
}
