"use client";

import { useEffect, useState } from "react";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@gnd/ui/tanstack";
import { InventorySuppliersManager } from "./inventory-suppliers-manager";

type SupplierRecord = {
    id?: number | null;
    uid?: string | null;
    name: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
};

export function InventorySuppliersPage() {
    const trpc = useTRPC();
    const suppliersQuery = useQuery(
        trpc.inventories.inventorySuppliers.queryOptions({
            q: null,
        }),
    );
    const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);

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
            title="Suppliers"
            description="Search, create, edit, and reconcile suppliers used across inventory pricing, receiving, and Dyke door imports."
        />
    );
}
