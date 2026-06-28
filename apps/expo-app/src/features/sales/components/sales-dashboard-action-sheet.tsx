import { Icon } from "@/components/ui/icon";
import { Pressable } from "@/components/ui/pressable";
import { useInvoiceFormStore } from "@/features/sales/invoice-form/store/use-invoice-form-store";
import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { FloatingFooterActionChooser } from "./floating-footer-action-chooser";
import {
	getSalesCustomerSelectorRoute,
	getSalesDashboardDocumentType,
	getSalesDispatchCreateRoute,
	type SalesDashboardAction,
	salesDashboardActionOptions,
} from "./sales-dashboard-action-options";

export function SalesDashboardActionSheet() {
	const router = useRouter();
	const actions = useInvoiceFormStore((state) => state.actions);

	const handleAction = (action: SalesDashboardAction) => {
		const documentType = getSalesDashboardDocumentType(action);
		if (documentType) {
			actions.reset();
			actions.setFormType(documentType);
			router.push(getSalesCustomerSelectorRoute(documentType) as Href);
			return;
		}
		router.push(getSalesDispatchCreateRoute() as Href);
	};

	return (
		<FloatingFooterActionChooser
			triggerTitle="Sales actions"
			triggerSubtitle="Create a sale, quote, or dispatch"
			triggerIcon="Plus"
			options={salesDashboardActionOptions.map((option) => ({
				value: option.action,
				title: option.title,
				subtitle: option.description,
				icon: option.icon,
			}))}
			onSelect={handleAction}
			cancelTitle="Cancel"
			cancelSubtitle="Return to the sales dashboard"
			renderTrigger={({ open }) => (
				<Pressable
					haptic
					accessibilityRole="button"
					accessibilityLabel="Open sales actions"
					onPress={open}
					className="h-14 w-14 items-center justify-center rounded-full bg-primary shadow-md active:opacity-85"
				>
					<Icon name="Plus" className="text-primary-foreground" size={24} />
				</Pressable>
			)}
		/>
	);
}
