/** @jsxImportSource react */
"use client";

import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { SalesFormComposition } from "../../contracts";
import {
	SALES_FORM_SAVE_CHOICE_DELAY_MS,
	SALES_FORM_SAVE_CHOICE_DELAY_SECONDS,
} from "../save-choice-timing";
import { SalesFormSummarySidebar } from "../summary/invoice-summary-sidebar";

function currency(value?: number | null) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(Number(value || 0));
}

export type SalesFormShellProps = SalesFormComposition;

function MobileCountdownSave({
	disabled,
	isSaving,
	label,
	onSave,
	onSaveClose,
	onSaveNew,
}: {
	disabled?: boolean;
	isSaving?: boolean;
	label: string;
	onSave?: () => Promise<void> | void;
	onSaveClose?: () => Promise<void> | void;
	onSaveNew?: () => Promise<void> | void;
}) {
	const optionsId = useId();
	const [optionsOpen, setOptionsOpen] = useState(false);
	const [countdown, setCountdown] = useState(
		SALES_FORM_SAVE_CHOICE_DELAY_SECONDS,
	);
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	const clearTimers = useCallback(() => {
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
			timeoutRef.current = null;
		}
		if (intervalRef.current) {
			clearInterval(intervalRef.current);
			intervalRef.current = null;
		}
	}, []);

	const runSave = (mode: "save" | "close" | "new") => {
		clearTimers();
		setOptionsOpen(false);
		if (mode === "close") {
			void onSaveClose?.();
			return;
		}
		if (mode === "new") {
			void onSaveNew?.();
			return;
		}
		void onSave?.();
	};

	const cancelOptions = () => {
		clearTimers();
		setOptionsOpen(false);
	};

	const openOptions = () => {
		if (disabled || isSaving) return;
		clearTimers();
		setCountdown(SALES_FORM_SAVE_CHOICE_DELAY_SECONDS);
		setOptionsOpen(true);
		intervalRef.current = setInterval(() => {
			setCountdown((current) => Math.max(1, current - 1));
		}, 1000);
		timeoutRef.current = setTimeout(
			() => runSave("save"),
			SALES_FORM_SAVE_CHOICE_DELAY_MS,
		);
	};

	useEffect(() => clearTimers, [clearTimers]);

	return (
		<div
			className="relative flex shrink-0 items-center justify-end"
			onKeyDown={(event) => {
				if (event.key === "Escape") cancelOptions();
			}}
		>
			<div className="flex items-stretch">
				<Button
					type="button"
					className="h-11 min-w-20 rounded-r-none px-3"
					onClick={openOptions}
					aria-expanded={optionsOpen}
					aria-controls={optionsId}
					disabled={disabled || isSaving}
				>
					{isSaving ? "Saving..." : label}
				</Button>
				<Button
					type="button"
					size="icon"
					className="size-11 rounded-l-none border-l border-primary-foreground/25"
					aria-label="Save modes"
					aria-expanded={optionsOpen}
					aria-controls={optionsId}
					disabled={disabled || isSaving}
					onClick={optionsOpen ? cancelOptions : openOptions}
				>
					<Icons.ChevronDown className="size-4" />
				</Button>
			</div>
			<fieldset
				data-sales-form-save-options
				inert={!optionsOpen}
				id={optionsId}
				aria-label="Save options"
				className={[
					"absolute bottom-full right-0 mb-4 grid w-[min(22rem,calc(100vw-1.5rem))] grid-cols-2 gap-2 rounded-xl border bg-card p-3 shadow-xl transition-all duration-200 ease-out motion-reduce:transition-none",
					optionsOpen
						? "visible scale-100 opacity-100"
						: "invisible pointer-events-none scale-95 opacity-0",
				].join(" ")}
			>
				<Button
					type="button"
					size="sm"
					disabled={disabled || isSaving}
					className="h-11 rounded-full px-3 text-xs"
					onClick={() => runSave("save")}
				>
					{isSaving ? "Saving..." : `Save (${countdown})`}
				</Button>
				<Button
					type="button"
					size="sm"
					variant="outline"
					disabled={disabled || isSaving || !onSaveClose}
					className="h-11 rounded-full px-3 text-xs"
					onClick={() => runSave("close")}
				>
					Save & Close
				</Button>
				<Button
					type="button"
					size="sm"
					variant="outline"
					disabled={disabled || isSaving || !onSaveNew}
					className="h-11 rounded-full px-3 text-xs"
					onClick={() => runSave("new")}
				>
					Save & New
				</Button>
				<Button
					type="button"
					size="sm"
					variant="ghost"
					disabled={disabled || isSaving}
					className="h-11 rounded-full px-3 text-xs"
					onClick={cancelOptions}
				>
					Cancel
				</Button>
			</fieldset>
		</div>
	);
}

export function SalesFormShell(props: SalesFormShellProps) {
	const slots = props.slots || {};
	const surface = props.surface || "fixed";
	const showMobileFooter = props.showMobileFooter ?? true;
	const mobileSaveLabel = props.mobileSaveLabel || "Save";
	const frameClassName =
		surface === "embedded"
			? "relative flex min-h-[560px] overflow-hidden rounded-lg border border-slate-200/80 bg-background shadow-sm"
			: "fixed bottom-0 left-0 right-0 top-[var(--header-height)] overflow-hidden bg-background md:left-[84px]";
	const innerClassName =
		surface === "embedded"
			? "relative flex min-h-[560px] w-full overflow-hidden bg-background"
			: "relative flex h-full min-h-0 overflow-hidden border-x border-b border-slate-200/80 bg-background shadow-sm";
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
			<div data-sales-form-shell className={frameClassName}>
				<div className={innerClassName}>
					<main className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
						{props.children}

						<div className="flex-1 overflow-y-auto overscroll-contain pb-[calc(5rem+env(safe-area-inset-bottom))] scroll-pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-20 lg:scroll-pb-20">
							<div className="mx-auto flex w-full max-w-6xl flex-col">
								{slots.RecoveryBanner}
								{slots.MainPanel}
							</div>
						</div>

						<div
							className={showMobileFooter ? "hidden lg:contents" : "contents"}
						>
							{slots.FloatingActions}
						</div>
					</main>

					{summaryPanel ? (
						<SalesFormSummarySidebar
							mode={props.mode}
							type={props.type}
							isSaved={Boolean(props.isSaved)}
							isSaving={props.isSaving}
							mobileOpen={Boolean(props.mobileSummaryOpen)}
							orderId={props.orderId}
							grandTotal={props.grandTotal}
							grandTotalSlot={slots.GrandTotalValue}
							capabilities={props.capabilities}
							permissions={props.permissions}
							summaryPanel={summaryPanel}
							historyPanel={
								props.capabilities.salesHistory
									? slots.SalesHistoryPanel
									: undefined
							}
							onSaveDraft={() => void props.onSaveDraft?.()}
							onSaveClose={() => void props.onSaveClose?.()}
							onSaveNew={() => void props.onSaveNew?.()}
							onSaveFinal={() => void props.onSaveFinal?.()}
							onClose={() => props.onCloseSummary?.()}
						/>
					) : null}

					{showMobileFooter ? (
						<div
							data-sales-form-mobile-footer
							className="absolute inset-x-0 bottom-0 z-20 border-t bg-card px-3 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] shadow-[0_-4px_18px_rgba(0,0,0,0.08)] lg:hidden"
						>
							<div className="mx-auto flex w-full max-w-lg items-center gap-3">
								<button
									type="button"
									className="flex min-h-11 min-w-0 flex-1 flex-col items-start justify-center"
									onClick={props.onOpenSummary}
								>
									<span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
										Total · Review
									</span>
									<span className="text-lg font-bold text-foreground">
										{slots.GrandTotalValue || currency(props.grandTotal)}
									</span>
								</button>
								<MobileCountdownSave
									label={mobileSaveLabel}
									isSaving={props.isSaving}
									disabled={!props.permissions.canSaveDraft}
									onSave={props.onSaveDraft}
									onSaveClose={props.onSaveClose}
									onSaveNew={props.onSaveNew}
								/>
							</div>
						</div>
					) : null}
				</div>
			</div>
		</>
	);
}
