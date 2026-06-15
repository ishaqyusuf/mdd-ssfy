import { CustomerSelectorScreen } from "@/features/sales/invoice-form/components/invoice-form-screen";
import { useInvoiceFormStore } from "@/features/sales/invoice-form/store/use-invoice-form-store";
import type { NewSalesFormType } from "@/features/sales/invoice-form/types";
import type { Href } from "expo-router";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";

export default function InvoiceCustomerSelectorRoute() {
	const router = useRouter();
	const params = useLocalSearchParams<{ source?: string; type?: string }>();
	const actions = useInvoiceFormStore((state) => state.actions);
	const type = normalizeSalesFormType(params.type);
	const source = normalizeParam(params.source);
	const isInitialNewInvoiceSelection = source === "new";

	useEffect(() => {
		actions.setFormType(type);
	}, [actions, type]);

	const closeToPreviousScreen = () => {
		if (router.canGoBack()) {
			router.back();
			return;
		}
		router.replace("/(sales)" as Href);
	};

	const openInvoiceForm = () => {
		router.replace({
			pathname: "/(sales)/invoices/new",
			params: { skipCustomerSelector: "1", type },
		} as Href);
	};

	return (
		<CustomerSelectorScreen
			onClose={closeToPreviousScreen}
			onCustomerSelected={() => {
				actions.setStep("items");
				if (isInitialNewInvoiceSelection) {
					openInvoiceForm();
					return;
				}
				router.back();
			}}
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
