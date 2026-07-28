import { CustomerSelectorScreen } from "@/features/sales/invoice-form/components/invoice-form-screen";
import {
	normalizeRouteParam,
	normalizeSalesFormTypeParam,
} from "@/features/sales/invoice-form/lib/sales-form-route-params";
import { useInvoiceFormStore } from "@/features/sales/invoice-form/store/use-invoice-form-store";
import type { Href } from "expo-router";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useLayoutEffect } from "react";

export default function InvoiceCustomerSelectorRoute() {
	const router = useRouter();
	const params = useLocalSearchParams<{ source?: string; type?: string }>();
	const actions = useInvoiceFormStore((state) => state.actions);
	const type = normalizeSalesFormTypeParam(params.type);
	const source = normalizeRouteParam(params.source);
	const isInitialNewInvoiceSelection = source === "new";

	useLayoutEffect(() => {
		if (isInitialNewInvoiceSelection) {
			actions.reset();
		}
		actions.setFormType(type);
	}, [actions, isInitialNewInvoiceSelection, type]);

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
			type={type}
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
