"use client";
import { useAuth } from "@/hooks/use-auth";
import { useInventoryStockParams } from "@/hooks/use-inventory-stock-params";
import { Button } from "@gnd/ui/button";
import { Plus } from "lucide-react";
import type { ComponentProps } from "react";
export function OpenInventoryStockSheet({
	inventoryId,
	inventoryVariantId,
	inventoryStockId,
	size,
	label = "Adjust stock",
	variant = "outline",
	iconOnly = false,
}: {
	inventoryId?: number;
	inventoryVariantId?: number;
	inventoryStockId?: number;
	size?: ComponentProps<typeof Button>["size"];
	variant?: ComponentProps<typeof Button>["variant"];
	label?: string;
	iconOnly?: boolean;
} = {}) {
	const auth = useAuth();
	const { setParams } = useInventoryStockParams();
	return (
		<Button
			type="button"
			variant={variant}
			size={size}
			aria-label={label}
			disabled={!auth.can.editInboundOrder}
			onClick={(event) => {
				event.stopPropagation();
				void setParams({
					stockOperation: "adjust",
					stockInventoryId: inventoryId ?? null,
					stockVariantId: inventoryVariantId ?? null,
					stockLocationId: inventoryStockId ?? null,
				});
			}}
		>
			<Plus className={iconOnly ? "size-4" : "mr-2 size-4"} />
			{iconOnly ? <span className="sr-only">{label}</span> : label}
		</Button>
	);
}
