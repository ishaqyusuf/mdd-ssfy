import type {
	SalesFormLineItemUiRecord,
	SalesFormState,
	SalesFormSummaryRecord,
} from "@gnd/sales/sales-form";

export type DealerSalesFormCustomer = {
	id: number;
	name?: string | null;
	businessName?: string | null;
	email?: string | null;
	phoneNo?: string | null;
	customerTypeId?: number | null;
};

export type DealerSalesFormProfile = {
	id: number;
	title?: string | null;
	salesPercentage?: number | null;
	defaultProfile?: boolean | null;
};

export type DealerInternalSalesFormProfile = {
	id?: number | null;
	title?: string | null;
	coefficient?: number | null;
};

export type DealerSalesFormRecord = {
	id?: number | null;
	type: "quote";
	salesId?: number | null;
	orderId?: string | null;
	slug?: string | null;
	status?: string | null;
	version?: string | null;
	updatedAt?: string | null;
	form: {
		customerId: number | null;
		customerProfileId: number | null;
		po?: string | null;
		paymentTerm?: string | null;
		goodUntil?: string | null;
		deliveryOption?: string | null;
		paymentMethod?: string | null;
		taxCode?: string | null;
	};
	lineItems: SalesFormLineItemUiRecord[];
	extraCosts: [];
	summary: SalesFormSummaryRecord;
};

export type DealerSalesFormState = SalesFormState<DealerSalesFormRecord>;
