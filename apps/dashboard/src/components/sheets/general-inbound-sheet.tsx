"use client";
import { GeneralInboundFormProvider } from "@/components/forms/general-inbound/form-context";
import { GeneralInboundContent } from "@/components/general-inbound-content";
import { useAuth } from "@/hooks/use-auth";
import { useInventoryInboundParams } from "@/hooks/use-inventory-inbound-params";
import { Sheet } from "@gnd/ui/sheet";
export function GeneralInboundSheet() {
	const { createWarehouseInbound, setParams } = useInventoryInboundParams();
	const auth = useAuth();
	const open =
		createWarehouseInbound === true && Boolean(auth.can.editInboundOrder);
	return (
		<Sheet
			open={open}
			onOpenChange={(value) => {
				if (!value) void setParams({ createWarehouseInbound: null });
			}}
		>
			{open ? (
				<GeneralInboundFormProvider>
					<GeneralInboundContent />
				</GeneralInboundFormProvider>
			) : null}
		</Sheet>
	);
}
