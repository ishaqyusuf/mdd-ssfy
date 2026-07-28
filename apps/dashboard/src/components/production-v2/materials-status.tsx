import { formatBusinessDate } from "@/lib/format-business-date";
import { Badge } from "@gnd/ui/badge";
import { Icons } from "@gnd/ui/icons";

export type ProductionMaterialStatus = {
	salesOrderId: number | null;
	salesItemId: number | null;
	componentId: number | null;
	name: string;
	readiness:
		| "ready_for_production"
		| "fulfilled"
		| "awaiting_inbound"
		| "allocation_review"
		| "blocked";
	stockStatus: string;
	requiredQty: number;
	availableQty: number;
	openInboundQty: number;
	expectedAt: Date | string | null;
	undatedOpenInboundQty: number;
};

function availabilityLabel(material: ProductionMaterialStatus) {
	const expectedDate = formatBusinessDate(material.expectedAt);
	if (
		material.openInboundQty > 0 &&
		expectedDate &&
		material.undatedOpenInboundQty > 0
	) {
		return `Latest known ETA ${expectedDate} · ${material.undatedOpenInboundQty} unscheduled`;
	}
	if (material.openInboundQty > 0 && expectedDate) {
		return `Expected ${expectedDate}`;
	}
	if (material.openInboundQty > 0) return "Inbound ordered · date pending";
	if (material.readiness === "allocation_review") return "Allocation review";
	return "Availability pending";
}

export function ProductionMaterialsNotice({
	materials,
	unavailable = false,
}: {
	materials: ProductionMaterialStatus[];
	unavailable?: boolean;
}) {
	if (unavailable) {
		return (
			<section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
				<div className="flex items-start gap-3">
					<Icons.AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-700" />
					<div>
						<p className="font-medium">Material status unavailable</p>
						<p className="mt-1 text-sm text-amber-900">
							This assignment remains active. Verify materials before beginning
							production.
						</p>
					</div>
				</div>
			</section>
		);
	}

	const pendingMaterials = materials.filter(
		(material) =>
			material.readiness !== "ready_for_production" &&
			material.readiness !== "fulfilled",
	);

	if (!materials.length) {
		return (
			<section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
				<div className="flex items-start gap-3">
					<Icons.Package className="mt-0.5 size-5 shrink-0 text-amber-700" />
					<div>
						<p className="font-medium">Materials are not configured</p>
						<p className="mt-1 text-sm text-amber-900">
							This assignment is active. Verify the required materials before
							beginning production.
						</p>
					</div>
				</div>
			</section>
		);
	}

	if (!pendingMaterials.length) {
		return (
			<section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
				<div className="flex items-start gap-3">
					<Icons.CheckCircle className="mt-0.5 size-5 shrink-0 text-emerald-700" />
					<div>
						<p className="font-medium">Materials ready</p>
						<p className="mt-1 text-sm text-emerald-800">
							Required inventory is recorded as available for production.
						</p>
					</div>
				</div>
			</section>
		);
	}

	return (
		<section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
			<div className="flex items-start gap-3">
				<Icons.Clock className="mt-0.5 size-5 shrink-0 text-amber-700" />
				<div className="min-w-0 flex-1">
					<p className="font-medium">Materials pending</p>
					<p className="mt-1 text-sm text-amber-900">
						This assignment is active. Begin work when the materials below are
						available.
					</p>
					<ul className="mt-3 grid gap-2 md:grid-cols-2">
						{pendingMaterials.map((material, index) => (
							<li
								key={`${material.salesItemId}-${material.componentId}-${index}`}
								className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-amber-200 bg-white/60 px-3 py-2"
							>
								<div className="min-w-0">
									<p className="truncate text-sm font-medium">
										{material.name}
									</p>
									<p className="text-xs text-amber-800">
										{material.requiredQty} required
										{material.availableQty
											? ` · ${material.availableQty} available`
											: ""}
										{material.openInboundQty
											? ` · ${material.openInboundQty} inbound`
											: ""}
									</p>
								</div>
								<Badge variant="outline" className="shrink-0 bg-white">
									{availabilityLabel(material)}
								</Badge>
							</li>
						))}
					</ul>
				</div>
			</div>
		</section>
	);
}
