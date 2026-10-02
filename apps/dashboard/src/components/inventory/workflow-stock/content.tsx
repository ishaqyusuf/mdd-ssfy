"use client";

import { Accordion } from "@gnd/ui/accordion";
import { Button } from "@gnd/ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@gnd/ui/collapsible";
import { Input } from "@gnd/ui/input";
import { ChevronRight, Package } from "lucide-react";
import { useWorkflowStock } from "./context";
import { WorkflowStockStatusLabel } from "./stock-status";
import { WorkflowStockVariantCard } from "./variant-card";

function ComponentImage({ src }: { src?: string | null }) {
	return (
		<span className="flex size-12 shrink-0 items-center justify-center rounded bg-muted">
			{src ? (
				<img src={src} alt="" className="size-full object-contain p-1" />
			) : (
				<Package aria-hidden="true" className="size-5 text-muted-foreground" />
			)}
		</span>
	);
}

export function WorkflowStockContent() {
	const stock = useWorkflowStock();
	const query = stock.selectedUid ? stock.detail : stock.overview;
	if (query.isPending)
		return (
			<output className="block p-4 text-sm text-muted-foreground">
				Loading inventory…
			</output>
		);
	if (query.isError)
		return (
			<div className="p-4">
				<p className="text-sm text-muted-foreground" role="alert">
					{query.error.message || "Inventory information unavailable."}
				</p>
				<Button
					type="button"
					variant="outline"
					className="mt-3"
					onClick={() => void query.refetch()}
				>
					Retry inventory
				</Button>
			</div>
		);
	if (!query.data?.tracked)
		return (
			<p className="p-4 text-sm text-muted-foreground">
				Track stock is off for this category. Enable it in Stock management to
				show stock status.
			</p>
		);
	if (stock.selectedUid)
		return <WorkflowStockComponentContent key={stock.selectedUid} />;
	const summaries = new Map(
		query.data.components.map((row) => [row.uid, row] as const),
	);
	return (
		<div className="space-y-3 p-4">
			<Input
				type="search"
				aria-label="Search inventory components"
				placeholder="Search inventory…"
				value={stock.search}
				onChange={(event) => stock.setSearch(event.target.value)}
				className="h-11 text-base"
			/>
			<p className="text-xs text-muted-foreground">
				Select a component to see its variants and warehouse stock.
			</p>
			<div>
				{stock.visible.map((component) => {
					const summary = summaries.get(component.uid);
					return (
						<button
							type="button"
							key={component.uid}
							ref={(node) => {
								if (node) stock.rowsRef.current.set(component.uid, node);
								else stock.rowsRef.current.delete(component.uid);
							}}
							onClick={() => stock.setSelectedUid(component.uid)}
							className="flex w-full items-center gap-3 border-b py-3 text-left"
						>
							<ComponentImage src={component.imageSrc} />
							<span className="min-w-0 flex-1">
								<span className="block break-words text-xs font-semibold">
									{component.title}
								</span>
								<span className="my-1 block text-[10px] text-muted-foreground">
									{summary?.mapped
										? `${summary.variantCount} ${summary.variantCount === 1 ? "variant" : "variants"}`
										: "Mapping needed"}
								</span>
								<WorkflowStockStatusLabel
									status={
										summary?.mapped && summary.status
											? summary.status
											: "mapping"
									}
								/>
							</span>
							<ChevronRight
								aria-hidden="true"
								className="size-4 shrink-0 text-muted-foreground"
							/>
						</button>
					);
				})}
			</div>
			{!stock.visible.length ? (
				<p className="py-4 text-center text-sm text-muted-foreground">
					No matching components.
				</p>
			) : null}
			{stock.total > 100 ? (
				<div className="flex items-center justify-between">
					<Button
						type="button"
						size="sm"
						variant="outline"
						disabled={!stock.page}
						onClick={() => stock.setPage(stock.page - 1)}
					>
						Previous
					</Button>
					<span className="text-xs text-muted-foreground">
						{stock.page * 100 + 1}–
						{Math.min((stock.page + 1) * 100, stock.total)} of {stock.total}
					</span>
					<Button
						type="button"
						size="sm"
						variant="outline"
						disabled={(stock.page + 1) * 100 >= stock.total}
						onClick={() => stock.setPage(stock.page + 1)}
					>
						Next
					</Button>
				</div>
			) : null}
		</div>
	);
}

function WorkflowStockComponentContent() {
	const stock = useWorkflowStock();
	const {
		variantSearch: search,
		setVariantSearch: setSearch,
		expandedVariant: expanded,
		setExpandedVariant: setExpanded,
		showMuted,
		setShowMuted,
	} = stock;
	const data = stock.detail.data;
	const component = data?.components[0];
	const unit =
		data?.stockUnit === "kit"
			? "kits"
			: data?.stockUnit === "length"
				? "lengths"
				: data?.stockUnit === "unit"
					? "units"
					: "stock units";
	const variants =
		component?.variants.filter((variant) =>
			`${variant.label} ${variant.uid} ${variant.id}`
				.toLowerCase()
				.includes(search.toLowerCase()),
		) ?? [];
	const enabled = variants.filter((variant) => variant.alertsEnabled);
	const muted = variants.filter((variant) => !variant.alertsEnabled);
	const isMutedOpen =
		showMuted || muted.some((variant) => String(variant.id) === expanded);
	const cards = (rows: typeof variants) => (
		<Accordion
			type="single"
			collapsible
			value={expanded}
			onValueChange={setExpanded}
		>
			{rows.map((variant) => (
				<WorkflowStockVariantCard
					key={variant.id}
					variant={variant}
					expanded={expanded === String(variant.id)}
					unit={unit}
				/>
			))}
		</Accordion>
	);
	return (
		<div className="space-y-3 p-4">
			<div className="flex items-center gap-3">
				<ComponentImage src={stock.selected?.imageSrc} />
				<div className="min-w-0">
					<p className="break-words text-sm font-semibold">
						{stock.selected?.title}
					</p>
					<p className="my-1 text-[10px] text-muted-foreground">
						{component?.variantCount || 0} variants · {unit}
					</p>
					<WorkflowStockStatusLabel
						status={
							component?.mapped && component.status
								? component.status
								: "mapping"
						}
					/>
				</div>
			</div>
			{!component?.mapped ? (
				<p className="text-xs text-muted-foreground">
					This component has no unambiguous inventory mapping. Stock
					availability is unknown.
				</p>
			) : (
				<>
					<Input
						type="search"
						aria-label="Search inventory variants"
						placeholder="Search size, variant or selection key…"
						value={search}
						onChange={(event) => setSearch(event.target.value)}
						className="h-11 text-base"
					/>
					<p className="text-[11px] leading-relaxed text-muted-foreground">
						Card warnings use variants with alerts on. Turning alerts off keeps
						the variant in inventory.
					</p>
					{cards(enabled)}
					{muted.length ? (
						<Collapsible
							open={isMutedOpen}
							onOpenChange={(open) => {
								setShowMuted(open);
								if (
									!open &&
									muted.some((variant) => String(variant.id) === expanded)
								)
									setExpanded("");
							}}
						>
							<CollapsibleTrigger asChild>
								<Button
									type="button"
									variant="ghost"
									className="mb-2 h-auto min-h-11 w-full justify-between px-0 text-left"
								>
									<span>
										<span className="block text-xs">
											Alerts off · {muted.length}
										</span>
										<span className="block text-[10px] font-normal text-muted-foreground">
											Still counted in inventory
										</span>
									</span>
									<ChevronRight
										aria-hidden="true"
										className={`size-4 ${isMutedOpen ? "rotate-90" : ""}`}
									/>
								</Button>
							</CollapsibleTrigger>
							<CollapsibleContent>{cards(muted)}</CollapsibleContent>
						</Collapsible>
					) : null}
					{!variants.length ? (
						<p className="py-4 text-center text-sm text-muted-foreground">
							No matching variants.
						</p>
					) : null}
				</>
			)}
		</div>
	);
}
