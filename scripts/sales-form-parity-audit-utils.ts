export type SalesAuditType = "order" | "quote";
export type SalesAuditStatus = "pass" | "fail" | "error";

export type SalesAuditRecordBase = {
	id: number;
	type: SalesAuditType;
	orderId: string | null;
	slug: string | null;
	createdAt: Date | string | null;
	updatedAt?: Date | string | null;
	subTotal?: number | null;
	tax?: number | null;
	grandTotal?: number | null;
};

export type SalesAuditManifestRecord = {
	id: number;
	type: SalesAuditType;
	orderId: string | null;
	slug: string | null;
	createdAt: string | null;
	updatedAt: string | null;
	persistedTotals: {
		subTotal: number;
		tax: number;
		grandTotal: number;
	};
};

export type SalesAuditMonthGroup<T extends SalesAuditRecordBase> = {
	month: string;
	order: T[];
	quote: T[];
	total: number;
};

export function roundCurrency(value: unknown) {
	const num = Number(value || 0);
	return Math.round((num + Number.EPSILON) * 100) / 100;
}

export function toIsoString(value: Date | string | null | undefined) {
	if (!value) return null;
	const date = value instanceof Date ? value : new Date(value);
	return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function monthKey(value: Date | string | null | undefined) {
	const iso = toIsoString(value);
	if (!iso) return "unknown";
	return iso.slice(0, 7);
}

export function groupSalesByMonth<T extends SalesAuditRecordBase>(records: T[]) {
	const grouped: Record<string, SalesAuditMonthGroup<T>> = {};
	for (const record of records) {
		const month = monthKey(record.createdAt);
		grouped[month] ??= {
			month,
			order: [],
			quote: [],
			total: 0,
		};
		grouped[month][record.type].push(record);
		grouped[month].total += 1;
	}
	return Object.fromEntries(
		Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a)),
	);
}

export function alternateLatestOrderQuote<T extends SalesAuditRecordBase>(
	group: Pick<SalesAuditMonthGroup<T>, "order" | "quote">,
) {
	const ordered: T[] = [];
	const orders = [...group.order];
	const quotes = [...group.quote];

	while (orders.length || quotes.length) {
		const order = orders.shift();
		if (order) ordered.push(order);
		const quote = quotes.shift();
		if (quote) ordered.push(quote);
	}

	return ordered;
}

export function selectOneOrderOneQuote<T extends SalesAuditRecordBase>(
	group: Pick<SalesAuditMonthGroup<T>, "order" | "quote">,
) {
	return [group.order[0], group.quote[0]].filter(Boolean) as T[];
}

export function manifestRecord(
	record: SalesAuditRecordBase,
): SalesAuditManifestRecord {
	return {
		id: record.id,
		type: record.type,
		orderId: record.orderId,
		slug: record.slug,
		createdAt: toIsoString(record.createdAt),
		updatedAt: toIsoString(record.updatedAt),
		persistedTotals: {
			subTotal: roundCurrency(record.subTotal),
			tax: roundCurrency(record.tax),
			grandTotal: roundCurrency(record.grandTotal),
		},
	};
}

export function compareTotals(input: {
	persisted: {
		subTotal?: number | null;
		tax?: number | null;
		grandTotal?: number | null;
	};
	calculated: {
		subTotal?: number | null;
		tax?: number | null;
		grandTotal?: number | null;
	};
}) {
	const fields = ["subTotal", "tax", "grandTotal"] as const;
	const deltas = Object.fromEntries(
		fields.map((field) => {
			const persisted = roundCurrency(input.persisted[field]);
			const calculated = roundCurrency(input.calculated[field]);
			return [field, roundCurrency(calculated - persisted)];
		}),
	) as Record<(typeof fields)[number], number>;
	const pass = fields.every((field) => deltas[field] === 0);
	return { pass, deltas };
}
