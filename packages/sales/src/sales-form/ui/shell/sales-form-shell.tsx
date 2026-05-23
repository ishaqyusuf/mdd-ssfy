"use client";

import { Button } from "@gnd/ui/button";
import type { SalesFormComposition } from "../../contracts";
import { SalesFormSummarySidebar } from "../summary/invoice-summary-sidebar";

function currency(value?: number | null) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(Number(value || 0));
}

export type SalesFormShellProps = SalesFormComposition;

export function SalesFormShell(props: SalesFormShellProps) {
	const slots = props.slots || {};
	const surface = props.surface || "fixed";
	const showMobileFooter = props.showMobileFooter ?? true;
	const mobileSaveLabel = props.mobileSaveLabel || "Finalize";
	const frameClassName =
		surface === "embedded"
			? "relative flex min-h-[560px] overflow-hidden rounded-lg border border-slate-200/80 bg-background shadow-sm"
			: "fixed bottom-0 left-0 right-0 top-[var(--header-height)] overflow-hidden bg-background md:left-[84px]";
	const innerClassName =
		surface === "embedded"
			? "relative flex min-h-[560px] w-full overflow-hidden bg-background"
			: "relative flex h-full min-h-0 overflow-hidden border border-slate-200/80 bg-background shadow-sm";
	const summaryPanel =
		slots.SummaryPanel ||
		slots.SalesHistoryPanel ||
		slots.SummaryFooterActions ||
		null;

	return (
		<>
			{slots.CustomerSelectorDialog}
			{props.capabilities.paymentMethodReview
				? slots.PaymentMethodReviewDialog
				: null}
			<div className={frameClassName}>
				<div className={innerClassName}>
					<main className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
						{props.children}

						<div className="flex-1 overflow-y-auto overscroll-contain pb-28 lg:pb-20">
							<div className="mx-auto flex w-full max-w-6xl flex-col">
								{slots.RecoveryBanner}
								{slots.MainPanel}
							</div>
						</div>

						{slots.FloatingActions}
					</main>

					{summaryPanel ? (
						<SalesFormSummarySidebar
							mode={props.mode}
							type={props.type}
							isSaved={Boolean(props.isSaved)}
							isSaving={props.isSaving}
							mobileOpen={Boolean(props.mobileSummaryOpen)}
							orderId={props.orderId}
							capabilities={props.capabilities}
							permissions={props.permissions}
							summaryPanel={summaryPanel}
							historyPanel={
								props.capabilities.salesHistory
									? slots.SalesHistoryPanel
									: undefined
							}
							onSave={() => void props.onSaveDraft?.()}
							onSaveClose={() => void props.onSaveClose?.()}
							onSaveNew={() => void props.onSaveNew?.()}
							onSaveFinal={() => void props.onSaveFinal?.()}
							onClose={() => props.onCloseSummary?.()}
						/>
					) : null}

					{showMobileFooter ? (
						<div className="absolute inset-x-0 bottom-0 z-20 border-t bg-card p-3 shadow-[0_-4px_18px_rgba(0,0,0,0.08)] lg:hidden">
							<div className="mx-auto flex w-full max-w-lg items-center gap-3">
								<button
									type="button"
									className="flex flex-1 flex-col items-start"
									onClick={props.onOpenSummary}
								>
									<span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
										Review Totals
									</span>
									<span className="text-lg font-bold text-foreground">
										{currency(props.grandTotal)}
									</span>
								</button>
								<Button
									className="h-11 px-4"
									onClick={() => void props.onSaveFinal?.()}
									disabled={props.isSaving || !props.permissions.canFinalize}
								>
									{mobileSaveLabel}
								</Button>
							</div>
						</div>
					) : null}
				</div>
			</div>
		</>
	);
}
