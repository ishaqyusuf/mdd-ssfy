"use client";
import { useAuth } from "@/hooks/use-auth";
import { useInventoryInboundParams } from "@/hooks/use-inventory-inbound-params";
import { Button } from "@gnd/ui/button";
import { Plus } from "lucide-react";
export function OpenGeneralInboundSheet() {
	const auth = useAuth();
	const { setParams } = useInventoryInboundParams();
	return (
		<Button
			variant="outline"
			disabled={!auth.can.editInboundOrder}
			onClick={() =>
				setParams({
					createWarehouseInbound: true,
					inboundId: null,
					inboundQueue: null,
				})
			}
		>
			<Plus className="mr-2 size-4" />
			Warehouse inbound
		</Button>
	);
}
