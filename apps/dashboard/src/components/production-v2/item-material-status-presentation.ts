import type {
	ItemMaterialStatusCode,
	ItemMaterialStatusTone,
} from "@gnd/sales/item-material-status";

export type ItemMaterialStatusNoticeInput = {
	code?: ItemMaterialStatusCode | null;
	label?: string | null;
	tone?: ItemMaterialStatusTone | null;
};

export type ItemMaterialStatusNoticeAudience = "admin" | "worker";

export function getItemMaterialStatusNotice(
	status: ItemMaterialStatusNoticeInput | null | undefined,
	audience: ItemMaterialStatusNoticeAudience,
) {
	if (!status?.code || !status.label || !status.tone) return null;
	if (audience === "worker") {
		if (
			status.code === "not_required" ||
			status.code === "setup_needed" ||
			status.code === "status_unknown"
		) {
			return null;
		}
		if (status.code === "material_conflict") {
			return {
				label: "MATERIAL NEEDED",
				tone: "warning" as const,
			};
		}
	}

	return {
		label: status.label,
		tone: status.tone,
	};
}
