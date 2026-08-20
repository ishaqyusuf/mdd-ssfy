import type { PrintSpecialOrderData } from "@gnd/sales/print/types";

export function getSpecialOrderColors(status: PrintSpecialOrderData["status"]) {
	return status === "CUSTOMER_APPROVED"
		? {
				background: "#ecfdf5",
				border: "#22c55e",
				foreground: "#166534",
			}
		: {
				background: "#fff7ed",
				border: "#f97316",
				foreground: "#9a3412",
			};
}
