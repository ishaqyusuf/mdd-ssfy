import { InvoiceFormScreen } from "@/features/sales/invoice-form/components/invoice-form-screen";
import {
	normalizeRouteParam,
	normalizeSalesFormTypeParam,
} from "@/features/sales/invoice-form/lib/sales-form-route-params";
import { useLocalSearchParams } from "expo-router";

export default function NewInvoiceRoute() {
	const params = useLocalSearchParams<{
		skipCustomerSelector?: string;
		type?: string;
	}>();
	const type = normalizeSalesFormTypeParam(params.type);
	const skipInitialCustomerSelector =
		normalizeRouteParam(params.skipCustomerSelector) === "1";

	return (
		<InvoiceFormScreen
			mode="create"
			skipInitialCustomerSelector={skipInitialCustomerSelector}
			type={type}
		/>
	);
}
