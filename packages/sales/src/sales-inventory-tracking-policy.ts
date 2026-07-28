export type SalesInventoryTrackingPolicy =
	| "tracked"
	| "untracked"
	| "not_inventory";

export type SalesInventoryTrackingPolicyInput = {
	inventoryId?: number | null;
	inventoryVariantId?: number | null;
	inventory?: {
		id?: number | null;
		productKind?: string | null;
		stockMode?: string | null;
	} | null;
	inventoryVariant?: {
		id?: number | null;
	} | null;
	inventoryCategory?: {
		productKind?: string | null;
		stockMode?: string | null;
	} | null;
	subComponent?: {
		defaultInventory?: {
			productKind?: string | null;
			stockMode?: string | null;
		} | null;
		inventoryCategory?: {
			productKind?: string | null;
			stockMode?: string | null;
		} | null;
	} | null;
};

export function resolveSalesInventoryTrackingPolicy(
	component: SalesInventoryTrackingPolicyInput,
): SalesInventoryTrackingPolicy {
	const productKinds = [
		component.inventoryCategory?.productKind,
		component.subComponent?.inventoryCategory?.productKind,
		component.inventory?.productKind,
		component.subComponent?.defaultInventory?.productKind,
	].filter(Boolean);
	const productKind = productKinds.includes("component")
		? "component"
		: productKinds[0] || null;
	const stockMode =
		component.inventoryCategory?.stockMode ||
		component.subComponent?.inventoryCategory?.stockMode ||
		component.inventory?.stockMode ||
		component.subComponent?.defaultInventory?.stockMode ||
		null;
	const hasInventoryIdentity =
		Boolean(component.inventoryVariantId) ||
		Boolean(component.inventoryVariant?.id) ||
		Boolean(component.inventoryId) ||
		Boolean(component.inventory?.id);

	if (!hasInventoryIdentity || productKind === "component") {
		return "not_inventory";
	}
	if (stockMode === "monitored") return "tracked";
	return "untracked";
}
