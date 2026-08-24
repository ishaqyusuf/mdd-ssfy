import { createContext, useContext, type ReactNode } from "react";
import type {
	DispatchOverview,
	DispatchOverviewItem,
	QtyMatrix,
} from "../../../types/dispatch.types";

export type DispatchDetailScreenVm = {
	onBack: () => void;
	titleText: string;
	insetsBottom: number;
	entryMode: "dispatch" | "packing" | "warehouse-packing";
	statusText: string;
	dueDateLabel?: string | null;
	dueStatusLabel?: string | null;
	dueBucket?: string | null;
	dispatchReadiness?: DispatchOverview["dispatchReadiness"];
	packingWorkspaceStats: {
		totalItems: number;
		packedItems: number;
		remainingItems: number;
		packedQty: number;
		remainingQty: number;
	};
	isPrimaryActionDisabled: boolean;
	isPrimaryActionPending: boolean;
	primaryStatusActionLabel: string;
	onPrimaryStatusAction: () => void | Promise<void>;
	isRefetching: boolean;
	onRefresh: () => void | Promise<unknown>;
	showDriverDuplicateAlert: boolean;
	isNotificationPending: boolean;
	onNotifyDuplicateDispatchToAdmin: () => void | Promise<void>;
	showAdminDuplicateCard: boolean;
	hasDuplicateDispatch: boolean;
	duplicateDispatches: NonNullable<
		DispatchOverview["duplicateInsight"]
	>["dispatches"];
	duplicateInsight?: DispatchOverview["duplicateInsight"];
	showTripCancelCard: boolean;
	onCancelTrip: () => void | Promise<void>;
	isCancelTripPending: boolean;
	customerName: string;
	customerPhone: string;
	customerEmail: string;
	onCallCustomer: () => void | Promise<void>;
	onEmailCustomer: () => void | Promise<void>;
	onOpenDirections: () => void | Promise<void>;
	addressLine1: string;
	addressLine2: string;
	itemsCount: number;
	topPackingItems: DispatchOverviewItem[];
	resolveItemImage: (value?: string | null) => string | null;
	resolvedAvailableQty: (item: DispatchOverviewItem) => QtyMatrix;
	totalQty: (qty: QtyMatrix) => number;
	onSelectPackingItem: (uid: string) => void;
	onImagePress: (uri: string) => void;
	showPackingButtons: boolean;
	isUpdatePackingDisabled: boolean;
	onOpenUpdatePacking: () => void;
	isResetPackingDisabled: boolean;
	onResetPacking: () => void | Promise<void>;
	showUnpackableHint: boolean;
	unpackableCount: number;
	onOpenSalesRequestModal: () => void;
	activeDispatchId: number;
	activityRefreshToken: number;
	onIssue: () => void | Promise<void>;
	isIssuePending: boolean;
	onFooterPrimaryAction: () => void | Promise<void>;
	footerPrimaryDisabled: boolean;
	footerPrimaryLabel: string;
};

const DispatchDetailScreenContext =
	createContext<DispatchDetailScreenVm | null>(null);

export function DispatchDetailScreenProvider({
	value,
	children,
}: {
	value: DispatchDetailScreenVm;
	children: ReactNode;
}) {
	return (
		<DispatchDetailScreenContext.Provider value={value}>
			{children}
		</DispatchDetailScreenContext.Provider>
	);
}

export function useDispatchDetailScreen() {
	const ctx = useContext(DispatchDetailScreenContext);
	if (!ctx) {
		throw new Error(
			"useDispatchDetailScreen must be used within DispatchDetailScreenProvider",
		);
	}
	return ctx;
}
