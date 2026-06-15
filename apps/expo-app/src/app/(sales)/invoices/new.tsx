import { InvoiceFormScreen } from "@/features/sales/invoice-form/components/invoice-form-screen";
import type { NewSalesFormType } from "@/features/sales/invoice-form/types";
import { useLocalSearchParams } from "expo-router";

export default function NewInvoiceRoute() {
	const params = useLocalSearchParams<{
		skipCustomerSelector?: string;
		type?: string;
	}>();
	const type = normalizeSalesFormType(params.type);
	const skipInitialCustomerSelector =
		normalizeParam(params.skipCustomerSelector) === "1";

	return (
		<InvoiceFormScreen
			mode="create"
			skipInitialCustomerSelector={skipInitialCustomerSelector}
			type={type}
		/>
	);
}

function normalizeSalesFormType(value?: string | string[]): NewSalesFormType {
	const raw = normalizeParam(value);
	return raw === "quote" ? "quote" : "order";
}

function normalizeParam(value?: string | string[]) {
	return Array.isArray(value) ? value[0] : value;
}
