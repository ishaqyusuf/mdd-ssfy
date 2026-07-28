import { cva } from "@gnd/ui/cn";

import type { TableStyle } from "./types";

export const tableCellPaddingVariants = cva("", {
	variants: {
		style: {
			default: "p-2 px-4",
			compact: "p-2",
		},
	},
	defaultVariants: {
		style: "default",
	},
});

export function getTableCellPaddingClass(style: TableStyle) {
	return tableCellPaddingVariants({ style });
}
