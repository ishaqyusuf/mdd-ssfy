"use client";

import { useEffect, useRef, useState } from "react";

import {
	applyMultiSelectStepMutation,
	deriveMouldingRows,
	getSelectedMouldingComponentsForLine,
	sharedMouldingComponentPrice,
	summarizeMouldingPersistRows,
} from "@gnd/sales/sales-form";

import type { NewSalesFormLineItem } from "../../schema";

type WorkflowStep = NonNullable<NewSalesFormLineItem["formSteps"]>[number];
type WorkflowComponent = {
	uid?: string | null;
	title?: string | null;
	description?: string | null;
	qty?: number | null;
	addon?: number | null;
	customPrice?: number | string | null;
	salesPrice?: number | null;
	basePrice?: number | null;
	[key: string]: unknown;
};

type MouldingSelectionPopoverState = {
	open: boolean;
	lineUid: string | null;
	stepIndex: number;
	component: WorkflowComponent | null;
	qty: string;
};

function getMouldingRows(line: NewSalesFormLineItem): WorkflowComponent[] {
	const lineMeta = line.meta as NewSalesFormLineItem["meta"] & {
		mouldingRows?: WorkflowComponent[];
	};
	return Array.isArray(lineMeta?.mouldingRows) ? lineMeta.mouldingRows : [];
}

function normalizeMouldingStoredRows(rows: WorkflowComponent[]) {
	return rows.map((row) => ({
		uid: String(row?.uid || ""),
		title: String(row?.title || ""),
		description: String(row?.description || ""),
		qty: Number(row?.qty || 0),
		addon: Number(row?.addon || 0),
		customPrice:
			row?.customPrice == null || row?.customPrice === ""
				? null
				: Number(row.customPrice || 0),
		salesPrice: Number(row?.salesPrice || 0),
		basePrice: Number(row?.basePrice || 0),
	}));
}

function closePopoverState(): MouldingSelectionPopoverState {
	return {
		open: false,
		lineUid: null,
		stepIndex: -1,
		component: null,
		qty: "1",
	};
}

export function useMouldingWorkflow(args: {
	activeLine: NewSalesFormLineItem | null;
	activeStep?: WorkflowStep | null;
	activeStepIndex: number;
	normalizeTitle: (value?: string | null) => string;
	visibleComponents: WorkflowComponent[];
	updateLineItem: (uid: string, patch: Partial<NewSalesFormLineItem>) => void;
}) {
	const {
		activeLine,
		activeStep,
		activeStepIndex,
		normalizeTitle,
		visibleComponents,
		updateLineItem,
	} = args;
	const [mouldingSelectionPopover, setMouldingSelectionPopover] =
		useState<MouldingSelectionPopoverState>(closePopoverState);
	const mouldingQtyInputRef = useRef<HTMLInputElement | null>(null);

	const activeMouldingSync = (() => {
		if (!activeLine) return null;
		const selectedMouldings = getSelectedMouldingComponentsForLine(activeLine);
		if (!selectedMouldings.length) return null;
		const existingRows = getMouldingRows(activeLine);
		const sharedComponentPrice = sharedMouldingComponentPrice(
			activeLine.formSteps || [],
		);
		const derivedRows = deriveMouldingRows({
			selectedMouldings,
			existingRows,
			sharedComponentPrice,
		});
		const summary = summarizeMouldingPersistRows(
			derivedRows,
			sharedComponentPrice,
		);
		const normalizedExistingRows = normalizeMouldingStoredRows(existingRows);
		const rowsChanged =
			JSON.stringify(normalizedExistingRows) !==
			JSON.stringify(summary.storedRows);
		const qtyChanged = Number(activeLine.qty || 0) !== summary.qtyTotal;
		const totalChanged =
			Number(Number(activeLine.lineTotal || 0).toFixed(2)) !== summary.total;
		const unitPriceChanged =
			Number(Number(activeLine.unitPrice || 0).toFixed(2)) !==
			summary.unitPrice;
		if (!rowsChanged && !qtyChanged && !totalChanged && !unitPriceChanged) {
			return null;
		}
		return {
			lineUid: activeLine.uid,
			meta: {
				...(activeLine.meta || {}),
				mouldingRows: summary.storedRows,
			},
			qty: summary.qtyTotal,
			lineTotal: summary.total,
			unitPrice: summary.unitPrice,
		};
	})();

	useEffect(() => {
		if (!activeMouldingSync) return;
		updateLineItem(activeMouldingSync.lineUid, {
			meta: activeMouldingSync.meta,
			qty: activeMouldingSync.qty,
			lineTotal: activeMouldingSync.lineTotal,
			unitPrice: activeMouldingSync.unitPrice,
		});
	}, [activeMouldingSync, updateLineItem]);

	useEffect(() => {
		if (!mouldingSelectionPopover.open) return;
		const timer = window.setTimeout(() => {
			mouldingQtyInputRef.current?.focus();
			mouldingQtyInputRef.current?.select();
		}, 0);
		return () => window.clearTimeout(timer);
	}, [mouldingSelectionPopover.open]);

	useEffect(() => {
		if (!mouldingSelectionPopover.open) return;
		if (
			mouldingSelectionPopover.lineUid !== activeLine?.uid ||
			mouldingSelectionPopover.stepIndex !== activeStepIndex ||
			normalizeTitle(activeStep?.step?.title) !== "moulding"
		) {
			setMouldingSelectionPopover(closePopoverState());
		}
	}, [
		activeLine?.uid,
		activeStep?.step?.title,
		activeStepIndex,
		mouldingSelectionPopover.lineUid,
		mouldingSelectionPopover.open,
		mouldingSelectionPopover.stepIndex,
		normalizeTitle,
	]);

	function openMouldingSelectionQtyPopover(
		line: NewSalesFormLineItem,
		stepIndex: number,
		component: WorkflowComponent,
	) {
		const existingRows = getMouldingRows(line);
		const existingRow = existingRows.find(
			(row) => String(row?.uid || "") === String(component?.uid || ""),
		);
		const existingQty = Number(existingRow?.qty || 0);
		setMouldingSelectionPopover({
			open: true,
			lineUid: line.uid,
			stepIndex,
			component,
			qty:
				Number.isFinite(existingQty) && existingQty > 0
					? String(existingQty)
					: "1",
		});
	}

	function saveMouldingSelectionWithQty(
		line: NewSalesFormLineItem,
		steps: WorkflowStep[],
		currentStepIndex: number,
		component: WorkflowComponent,
		qtyInput: string,
		activeStepTitle?: string | null,
	) {
		const nextQty = Math.max(1, Number(qtyInput || 0) || 1);
		const nextSteps = [...steps];
		const multiMutation = applyMultiSelectStepMutation({
			steps: nextSteps,
			currentStepIndex,
			component,
			visibleComponents,
			selectedOverride: true,
			activeStepTitle: activeStepTitle || "",
		});
		const selectedComponents = Array.isArray(
			multiMutation.steps[currentStepIndex]?.meta?.selectedComponents,
		)
			? multiMutation.steps[currentStepIndex].meta.selectedComponents
			: [];
		const existingRows = getMouldingRows(line);
		const sharedComponentPrice = sharedMouldingComponentPrice(
			multiMutation.steps || [],
		);
		const derivedRows = deriveMouldingRows({
			selectedMouldings: selectedComponents,
			existingRows,
			sharedComponentPrice,
		}).map((row) =>
			String(row?.uid || "") === String(component?.uid || "")
				? {
						...row,
						qty: nextQty,
					}
				: row,
		);
		const summary = summarizeMouldingPersistRows(
			derivedRows,
			sharedComponentPrice,
		);
		const nextPatch: Partial<NewSalesFormLineItem> = {
			formSteps: multiMutation.steps,
			meta: {
				...(line.meta || {}),
				mouldingRows: summary.storedRows,
			},
			qty: summary.qtyTotal,
			lineTotal: summary.total,
			unitPrice: summary.unitPrice,
		};
		updateLineItem(line.uid, nextPatch);
		setMouldingSelectionPopover(closePopoverState());
	}

	return {
		mouldingSelectionPopover,
		mouldingQtyInputRef,
		openMouldingSelectionQtyPopover,
		saveMouldingSelectionWithQty,
		setMouldingSelectionQty: (qty: string) =>
			setMouldingSelectionPopover((prev) => ({
				...prev,
				qty,
			})),
		closeMouldingSelectionPopover: () =>
			setMouldingSelectionPopover(closePopoverState()),
	};
}
