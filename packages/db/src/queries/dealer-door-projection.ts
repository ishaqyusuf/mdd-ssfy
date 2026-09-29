import {
	allocateDealerRowCents,
	dealerFormSteps,
} from "./dealer-item-projection";

function record(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

function finite(value: unknown, fallback = 0) {
	const number = Number(value);
	return Number.isFinite(number) ? number : fallback;
}

function officePrice(value: unknown, ratio: number) {
	return Math.round(finite(value) * ratio * 100) / 100;
}

/** Persist a dealer door recipe in the relational shape read by the office editor. */
export function buildDealerDoorProjection(input: {
	uid: string;
	title?: string | null;
	description?: string | null;
	meta?: Record<string, unknown> | null;
	formSteps?: Record<string, unknown>[] | null;
	housePackageTool?: Record<string, unknown> | null;
	customerLineTotal: number;
	internalLineTotal: number;
	itemIndex: number;
}) {
	const sourceHpt = record(input.housePackageTool);
	const sourceDoors = Array.isArray(sourceHpt.doors) ? sourceHpt.doors : [];
	if (!sourceDoors.length) return null;
	const rows = sourceDoors.map((value) => {
		const door = record(value);
		const lhQty = finite(door.lhQty);
		const rhQty = finite(door.rhQty);
		const qty = finite(door.totalQty, lhQty + rhQty) || lhQty + rhQty;
		const dimension = String(door.dimension || "").trim();
		const weight = Math.round(
			finite(door.lineTotal, qty * finite(door.unitPrice)) * 100,
		);
		if (
			!dimension ||
			!Number.isSafeInteger(qty) ||
			qty < 0 ||
			!Number.isSafeInteger(lhQty) ||
			!Number.isSafeInteger(rhQty) ||
			lhQty < 0 ||
			rhQty < 0 ||
			!Number.isSafeInteger(weight) ||
			weight < 0
		) {
			throw new Error("Dealer door rows require a size, quantity, and price.");
		}
		return { door, dimension, qty, lhQty, rhQty, weight };
	});
	const cents = allocateDealerRowCents(rows, input.internalLineTotal);
	const customerTotal = finite(input.customerLineTotal);
	const ratio = customerTotal > 0 ? input.internalLineTotal / customerTotal : 0;
	const formSteps = (input.formSteps || []).flatMap((sourceStep) => {
		const step = dealerFormSteps([sourceStep])[0];
		if (!step) return [];
		const source = record(sourceStep);
		const meta = record(step.meta);
		const selected = Array.isArray(meta.selectedComponents)
			? meta.selectedComponents.map((value) => {
					const component = record(value);
					return {
						...component,
						...(component.salesPrice == null
							? {}
							: { salesPrice: officePrice(component.salesPrice, ratio) }),
						...(component.price == null
							? {}
							: { price: officePrice(component.price, ratio) }),
						...(component.customPrice == null
							? {}
							: { customPrice: officePrice(component.customPrice, ratio) }),
						...(component.overridePrice == null
							? {}
							: { overridePrice: officePrice(component.overridePrice, ratio) }),
					};
				})
			: null;
		return [
			{
				...step,
				qty: finite(source.qty),
				price: officePrice(source.price, ratio),
				basePrice: finite(source.basePrice),
				meta: {
					...meta,
					...(selected ? { selectedComponents: selected } : {}),
				},
			},
		];
	});
	const doors = rows.map(({ door, dimension, qty, lhQty, rhQty }, index) => {
		const total = (cents[index] || 0) / 100;
		if (!qty && total)
			throw new Error("A priced door row requires a quantity.");
		const unitPrice = qty ? total / qty : 0;
		const sourceMeta = record(door.meta);
		const sharedDoorSurcharge = officePrice(
			sourceMeta.sharedDoorSurcharge,
			ratio,
		);
		const flatRate = officePrice(sourceMeta.flatRate, ratio);
		const addon = officePrice(door.doorPrice ?? door.addon, ratio);
		const doorSalesUnitPrice =
			Math.round((unitPrice - sharedDoorSurcharge - flatRate - addon) * 100) /
			100;
		return {
			dimension,
			swing: String(door.swing || "") || null,
			doorType: String(door.doorType || sourceHpt.doorType || "") || null,
			lhQty,
			rhQty,
			totalQty: qty,
			doorPrice: addon,
			jambSizePrice: doorSalesUnitPrice,
			casingPrice: officePrice(door.casingPrice, ratio),
			unitPrice,
			lineTotal: total,
			stepProductId: finite(door.stepProductId) || null,
			meta: {
				...sourceMeta,
				// The office form must retain its saved price even when the dealer's
				// customer profile used a different coefficient.
				baseUnitPrice: 0,
				basePrice: 0,
				dealerCustomerBaseUnitPrice: finite(sourceMeta.baseUnitPrice),
				doorSalesUnitPrice,
				sharedDoorSurcharge,
				flatRate,
				addon,
				overridePrice: sourceMeta.overridePrice == null ? null : unitPrice,
				customPrice: sourceMeta.customPrice == null ? null : unitPrice,
				finalUnitPrice: unitPrice,
			},
		};
	});
	const totalQty = rows.reduce((sum, row) => sum + row.qty, 0);
	return {
		item: {
			description: input.description || input.title || "Door",
			dykeDescription: input.title || "Door",
			qty: totalQty,
			rate: totalQty ? input.internalLineTotal / totalQty : 0,
			total: input.internalLineTotal,
			meta: {
				uid: input.uid,
				title: input.title || "Door",
				meta: { ...input.meta, itemIndex: input.itemIndex },
			},
		},
		formSteps,
		housePackageTool: {
			height: String(sourceHpt.height || "") || null,
			doorType: String(sourceHpt.doorType || "") || null,
			doorId: finite(sourceHpt.doorId) || null,
			dykeDoorId: finite(sourceHpt.dykeDoorId) || null,
			jambSizeId: finite(sourceHpt.jambSizeId) || null,
			casingId: finite(sourceHpt.casingId) || null,
			moldingId: finite(sourceHpt.moldingId) || null,
			stepProductId: finite(sourceHpt.stepProductId) || null,
			totalPrice: input.internalLineTotal,
			totalDoors: totalQty,
			meta: record(sourceHpt.meta),
			doors,
		},
	};
}
