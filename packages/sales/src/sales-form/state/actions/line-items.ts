import {
	createEmptySalesFormLineItem,
	normalizeSalesFormLineItem,
	normalizeSalesFormLineItems,
} from "../../application";
import {
	getNextSalesFormActiveItem,
	getInitialSalesFormActiveStepByLine,
	recomputeSalesFormRecordSummary,
} from "../selectors";
import type { SalesFormState, SalesFormStateRecord } from "../types";
import { multiplyMoney } from "../../../payment-system/domain/money";

export function setSalesFormLineItems<
	TRecord extends SalesFormStateRecord,
	TState extends SalesFormState<TRecord>,
>(state: TState, lineItems: Partial<TRecord["lineItems"][number]>[]): TState {
	if (!state.record) return state;
	const normalizedLineItems = normalizeSalesFormLineItems(lineItems);
	if (
		JSON.stringify(state.record.lineItems || []) ===
		JSON.stringify(normalizedLineItems)
	) {
		return state;
	}

	return {
		...state,
		record: recomputeSalesFormRecordSummary({
			...state.record,
			lineItems: normalizedLineItems,
		} as TRecord),
		dirty: true,
		saveStatus: state.saveStatus === "error" ? "idle" : state.saveStatus,
	};
}

export function addSalesFormLineItem<
	TRecord extends SalesFormStateRecord,
	TState extends SalesFormState<TRecord>,
>(
	state: TState,
	line?: Partial<TRecord["lineItems"][number]>,
): TState {
	if (!state.record) return state;
	const next = normalizeSalesFormLineItem(
		line || createEmptySalesFormLineItem(state.record.lineItems.length),
		state.record.lineItems.length,
	);

	return {
		...state,
		record: recomputeSalesFormRecordSummary({
			...state.record,
			lineItems: [...state.record.lineItems, next],
		} as TRecord),
		editor: {
			...state.editor,
			activeItem: next.uid,
			activeStepByLine: {
				...state.editor.activeStepByLine,
				...getInitialSalesFormActiveStepByLine({
					...state.record,
					lineItems: [next],
				} as TRecord),
			},
		},
		dirty: true,
		saveStatus: state.saveStatus === "error" ? "idle" : state.saveStatus,
	};
}

export function updateSalesFormLineItem<
	TRecord extends SalesFormStateRecord,
	TState extends SalesFormState<TRecord>,
>(
	state: TState,
	uid: string,
	patch: Partial<TRecord["lineItems"][number]>,
): TState {
	if (!state.record) return state;
	const lineItems = state.record.lineItems.map((line, index) => {
		if (line.uid !== uid) return line;
		const merged = {
			...line,
			...patch,
			uid,
		};

		if (
			patch.lineTotal == null &&
			(Object.prototype.hasOwnProperty.call(patch, "qty") ||
				Object.prototype.hasOwnProperty.call(patch, "unitPrice"))
		) {
			merged.lineTotal = multiplyMoney(
				Number(merged.qty || 0),
				Number(merged.unitPrice || 0),
			);
		}

		return normalizeSalesFormLineItem(merged, index);
	});

	return {
		...state,
		record: recomputeSalesFormRecordSummary({
			...state.record,
			lineItems,
		} as TRecord),
		dirty: true,
		saveStatus: state.saveStatus === "error" ? "idle" : state.saveStatus,
	};
}

export function removeSalesFormLineItem<
	TRecord extends SalesFormStateRecord,
	TState extends SalesFormState<TRecord>,
>(state: TState, uid: string): TState {
	if (!state.record) return state;
	const activeStepByLine = { ...state.editor.activeStepByLine };
	delete activeStepByLine[uid];

	return {
		...state,
		record: recomputeSalesFormRecordSummary({
			...state.record,
			lineItems: state.record.lineItems.filter((line) => line.uid !== uid),
		} as TRecord),
		editor: {
			...state.editor,
			activeItem: getNextSalesFormActiveItem(
				state.record,
				uid,
				state.editor.activeItem,
			),
			activeStepByLine,
		},
		dirty: true,
		saveStatus: state.saveStatus === "error" ? "idle" : state.saveStatus,
	};
}
