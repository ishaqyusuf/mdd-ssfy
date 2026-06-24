import { useInvoiceFormStore } from "@/features/sales/invoice-form/store/use-invoice-form-store";
import type { NewSalesFormType } from "@/features/sales/invoice-form/types";
import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { FloatingFooterActionChooser } from "./floating-footer-action-chooser";
import {
	getNewSalesCustomerSelectorRoute,
	newSalesTypeOptions,
} from "./new-sales-type-options";

export function NewSalesTypeSheet() {
	const router = useRouter();
	const actions = useInvoiceFormStore((state) => state.actions);

	const openForm = (type: NewSalesFormType) => {
		actions.reset();
		actions.setFormType(type);
		router.push(getNewSalesCustomerSelectorRoute(type) as Href);
	};

	return (
		<FloatingFooterActionChooser
			triggerTitle="New Invoice"
			triggerSubtitle="Start a sales invoice or quote"
			triggerIcon="ReceiptText"
			options={newSalesTypeOptions.map((option) => ({
				value: option.type,
				title: option.title,
				subtitle: option.description,
				icon: option.icon,
			}))}
			onSelect={openForm}
			cancelTitle="Cancel"
			cancelSubtitle="Return to the sales dashboard"
		/>
	);
}
