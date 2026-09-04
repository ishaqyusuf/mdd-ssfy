import type { ItemMaterialStatus } from "@gnd/sales/item-material-status";
import { Badge } from "@gnd/ui/badge";

import { cn } from "@/lib/utils";
import {
	type ItemMaterialStatusNoticeAudience,
	getItemMaterialStatusNotice,
} from "./item-material-status-presentation";

const toneClasses: Record<ItemMaterialStatus["tone"], string> = {
	success: "border-emerald-200 bg-emerald-50 text-emerald-700",
	warning: "border-amber-200 bg-amber-50 text-amber-800",
	info: "border-blue-200 bg-blue-50 text-blue-700",
	destructive: "border-red-200 bg-red-50 text-red-700",
	neutral: "border-slate-200 bg-slate-50 text-slate-700",
};

type DeepPartial<T> = T extends Array<infer Item>
	? Array<DeepPartial<Item>>
	: T extends object
		? { [Key in keyof T]?: DeepPartial<T[Key]> }
		: T;

type ItemMaterialStatusView = DeepPartial<ItemMaterialStatus>;

export function ItemMaterialStatusBadge({
	status,
	className,
	audience = "admin",
}: {
	status?: ItemMaterialStatusView | null;
	className?: string;
	audience?: ItemMaterialStatusNoticeAudience;
}) {
	const notice = getItemMaterialStatusNotice(status, audience);
	if (!notice) return null;
	return (
		<output className={cn("relative z-10 inline-flex", className)}>
			<Badge
				variant="outline"
				className={cn(
					"rounded-full text-[10px] font-semibold tracking-[0.08em]",
					toneClasses[notice.tone],
				)}
			>
				{notice.label}
			</Badge>
		</output>
	);
}
