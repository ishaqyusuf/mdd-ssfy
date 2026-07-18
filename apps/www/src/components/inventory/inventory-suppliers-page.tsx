"use client";

import type { InventorySupplierRow } from "@/components/tables-2/inventory-suppliers/columns";
import { useTRPC } from "@/trpc/client";
import type { TableSettings } from "@/utils/table-settings";
import { useQuery } from "@gnd/ui/tanstack";
import { useEffect, useState } from "react";
import { InventorySuppliersManager } from "./inventory-suppliers-manager";

type Props = {
	initialSettings?: Partial<TableSettings>;
};

export function InventorySuppliersPage({ initialSettings }: Props) {
	const trpc = useTRPC();
	const suppliersQuery = useQuery(
		trpc.inventories.inventorySuppliers.queryOptions({
			q: null,
		}),
	);
	const [suppliers, setSuppliers] = useState<InventorySupplierRow[]>([]);

	useEffect(() => {
		if (!suppliersQuery.data) return;
		setSuppliers(
			suppliersQuery.data.map((supplier) => ({
				id: supplier.id,
				uid: supplier.uid,
				name: supplier.name,
				email: supplier.email,
				phone: supplier.phone,
				address: supplier.address,
			})),
		);
	}, [suppliersQuery.data]);

	return (
		<InventorySuppliersManager
			suppliers={suppliers}
			onSuppliersChange={setSuppliers}
			initialSettings={initialSettings}
			isLoading={suppliersQuery.isLoading}
			tableHeight="max(360px, calc(100vh - 370px + var(--header-offset, 0px)))"
			title="Suppliers"
			description="Search, create, edit, and reconcile suppliers used across inventory pricing, receiving, and Dyke door imports."
		/>
	);
}
