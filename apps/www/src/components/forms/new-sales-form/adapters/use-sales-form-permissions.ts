import { useAuth } from "@/hooks/use-auth";
import { createSalesFormPermissions } from "@gnd/sales/sales-form";

export function useSalesFormPermissions(type: "order" | "quote") {
	const auth = useAuth();

	return createSalesFormPermissions({
		canEditCustomer: Boolean(auth.can?.editSalesCustomers),
		canEditPricing: true,
		canSaveDraft: true,
		canFinalize: true,
		canPrint: true,
		canTakePayment: type === "order",
		canSendPacking: type === "order",
		canManageDispatch: type === "order",
		canOpenInternalOverview: true,
		canOpenSettings: true,
	});
}
