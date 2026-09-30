export type SalesChange = {
	key: string;
	item: string;
	field: string;
	before: string | null;
	after: string | null;
};
export type SalesChangeRecord = {
	event: "sales_form_change";
	schemaVersion: 1;
	actorUserId: number;
	adjustmentId: string | null;
	sourceVersion: string | null;
	targetVersion: string | null;
	reason: string | null;
	changes: SalesChange[];
};
export type SalesItemChangeSummary = {
	messages: string[];
	itemCount: number;
};

/** Project both old and new saved comparisons into a short item-only activity. */
export function summarizeSalesItemChanges(
	changes: SalesChange[],
): SalesItemChangeSummary {
	const groups = new Map<string, SalesChange[]>();
	for (const change of changes) {
		if (!change.key.startsWith("line:")) continue;
		const prefix = change.key.slice(0, change.key.lastIndexOf(":"));
		if (prefix.includes(":step:") || prefix.endsWith(":configuration"))
			continue;
		const group = groups.get(prefix) || [];
		group.push(change);
		groups.set(prefix, group);
	}
	const summaries = new Map<string, string>();
	for (const [prefix, group] of groups) {
		const presence = group.find((change) => change.field === "Item");
		const quantity = group.find((change) => change.field === "Quantity");
		if (!presence && !quantity) continue;
		const sample = presence || quantity!;
		const isNamedComponent = /:(serviceRows|mouldingRows|shelf):/.test(prefix);
		const item = isNamedComponent
			? sample.item.split(" · ").slice(1).join(" · ") || sample.item
			: sample.item;
		const before = quantity?.before;
		const after = quantity?.after;
		const removed =
			presence?.after === "Removed" ||
			(after === "0" && before != null && Number(before) > 0);
		const added = presence?.after === "Added";
		if (removed) {
			summaries.set(
				prefix,
				`${item}: removed${before != null ? `, previous quantity ${before}` : ""}`,
			);
		} else if (added) {
			summaries.set(
				prefix,
				`${item}: added${after != null ? `, quantity ${after}` : ""}`,
			);
		} else if (before != null && after != null && before !== after) {
			summaries.set(prefix, `${item}: quantity ${before} → ${after}`);
		}
	}
	// A group quantity repeats its children; keep the actual product/service rows.
	const prefixes = [...summaries.keys()];
	const messages = prefixes
		.filter(
			(prefix) => !prefixes.some((child) => child.startsWith(`${prefix}:`)),
		)
		.map((prefix) => summaries.get(prefix)!);
	return {
		messages: messages.length ? messages : ["Sale details updated"],
		itemCount: messages.length,
	};
}

export function salesItemChangeCountLabel(summary: SalesItemChangeSummary) {
	return summary.itemCount
		? `${summary.itemCount} ${summary.itemCount === 1 ? "item" : "items"} changed`
		: "Sale details updated";
}

export function salesChangeActivityStatus(
	status: string,
	failed = false,
): string | null {
	if (failed) return "Needs attention";
	if (status === "APPLIED") return null;
	return (
		(
			{
				APPROVED: "Awaiting application",
				APPLYING: "Applying",
				PENDING_CUSTOMER: "Awaiting approval",
				APPLIED_WITH_REVIEW: "Needs review",
				STALE: "Needs review",
				FAILED: "Needs attention",
				REJECTED: "Rejected",
				CANCELLED: "Cancelled",
				EXPIRED: "Expired",
			} as Record<string, string>
		)[status] || "Needs attention"
	);
}
type Row = Record<string, unknown>;
const row = (value: unknown): Row =>
	value && typeof value === "object" && !Array.isArray(value)
		? (value as Row)
		: {};
const rows = (value: unknown): Row[] =>
	Array.isArray(value) ? value.map(row) : [];
const moneyFields = new Set([
	"unitPrice",
	"lineTotal",
	"totalPrice",
	"grandTotal",
	"taxTotal",
	"subTotal",
	"amount",
	"doorPrice",
	"jambSizePrice",
	"casingPrice",
]);
const labels: Record<string, string> = {
	qty: "Quantity",
	unitPrice: "Unit price",
	lineTotal: "Line total",
	title: "Item name",
	description: "Description",
	taxxable: "Taxable",
	dimension: "Size",
	swing: "Swing",
	doorType: "Door type",
	lhQty: "Left hand quantity",
	rhQty: "Right hand quantity",
	totalQty: "Quantity",
	totalPrice: "Total",
	doorPrice: "Door price",
	jambSizePrice: "Jamb price",
	casingPrice: "Casing price",
	customerId: "Customer",
	customerProfileId: "Price profile",
	billingAddressId: "Billing address",
	shippingAddressId: "Shipping address",
	paymentTerm: "Payment terms",
	paymentDueDate: "Payment due",
	goodUntil: "Quote valid until",
	prodDueDate: "Production due",
	deliveryDueDate: "Delivery due",
	po: "PO number",
	notes: "Notes",
	deliveryOption: "Delivery option",
	paymentMethod: "Payment method",
	taxCode: "Tax code",
	status: "Status",
	inventoryStatus: "Inventory status",
	specialOrderDeclaration: "Special Order",
	grandTotal: "Order total",
	taxTotal: "Tax",
	subTotal: "Subtotal",
	amount: "Amount",
	component: "Component",
	type: "Type",
	value: "Selection",
	service: "Service",
	height: "Height",
	doorId: "Door",
	jambSizeId: "Jamb",
	casingId: "Casing",
	moldingId: "Moulding",
};
function display(value: unknown, field: string): string | null {
	if (value == null || value === "") return null;
	if (moneyFields.has(field)) return `$${Number(value).toFixed(2)}`;
	if (typeof value === "boolean") return value ? "Yes" : "No";
	if (field.endsWith("Date") || field === "goodUntil") {
		const date = new Date(String(value));
		if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10);
	}
	return Array.isArray(value)
		? value.map(String).sort().join(", ")
		: String(value);
}

/** Compare commercial fields only. Generated IDs, caches and timestamps aren't edits. */
export function buildSalesChanges(
	beforeInput: unknown,
	afterInput: unknown,
): SalesChange[] {
	const before = row(beforeInput),
		after = row(afterInput);
	const result: SalesChange[] = [];
	function fields(
		a: Row,
		b: Row,
		keys: string[],
		item: string,
		prefix: string,
	) {
		for (const field of keys) {
			if (
				field === "taxxable" &&
				prefix.startsWith("line:") &&
				prefix.split(":").length === 2 &&
				[a, b].some(
					(line) =>
						["serviceRows", "mouldingRows"].some(
							(kind) => rows(row(line.meta)[kind]).length,
						) ||
						rows(line.shelfItems).length ||
						rows(row(line.housePackageTool).doors).length,
				)
			)
				continue;
			const old = display(a[field], field),
				next = display(b[field], field);
			if (old !== next)
				result.push({
					key: `${prefix}:${field}`,
					item,
					field: labels[field] || field,
					before: old,
					after: next,
				});
		}
	}
	function collection(
		a: Row[],
		b: Row[],
		prefix: string,
		title: (r: Row) => string,
		keys: string[],
		identity: (r: Row, i: number) => string,
		children?: (a: Row, b: Row, key: string, item: string) => void,
	) {
		// A stable UID wins over newly assigned relational IDs.
		const old = new Map(a.map((r, i) => [identity(r, i), r]));
		const next = new Map(b.map((r, i) => [identity(r, i), r]));
		for (const key of new Set([...old.keys(), ...next.keys()])) {
			const prev = old.get(key),
				current = next.get(key);
			const item = title(current || prev || {});
			if (!prev || !current)
				result.push({
					key: `${prefix}:${key}:presence`,
					item,
					field: "Item",
					before: prev ? "Present" : null,
					after: current ? "Added" : "Removed",
				});
			fields(prev || {}, current || {}, keys, item, `${prefix}:${key}`);
			children?.(prev || {}, current || {}, `${prefix}:${key}`, item);
		}
	}
	fields(
		row(before.form || before.meta),
		row(after.form || after.meta),
		[
			"customerId",
			"customerProfileId",
			"billingAddressId",
			"shippingAddressId",
			"paymentTerm",
			"paymentDueDate",
			"goodUntil",
			"prodDueDate",
			"deliveryDueDate",
			"po",
			"notes",
			"deliveryOption",
			"paymentMethod",
			"taxCode",
		],
		"Sale details",
		"form",
	);
	fields(
		before,
		after,
		["status", "inventoryStatus", "specialOrderDeclaration"],
		"Sale details",
		"sale",
	);
	fields(
		row(before.summary),
		row(after.summary),
		["subTotal", "taxTotal", "grandTotal"],
		"Totals",
		"summary",
	);
	collection(
		rows(before.lineItems),
		rows(after.lineItems),
		"line",
		(r) => String(r.title || r.description || "Line item"),
		["title", "description", "qty", "unitPrice", "lineTotal", "taxxable"],
		(r, i) => String(r.uid || r.id || i),
		(a, b, prefix, item) => {
			collection(
				rows(row(a.housePackageTool).doors),
				rows(row(b.housePackageTool).doors),
				`${prefix}:door`,
				(r) => `${item} · ${String(r.dimension || "Door")}`,
				[
					"dimension",
					"swing",
					"doorType",
					"lhQty",
					"rhQty",
					"totalQty",
					"unitPrice",
					"lineTotal",
					"doorPrice",
					"jambSizePrice",
					"casingPrice",
				],
				(r, i) =>
					String(r.id || `${r.stepProductId || "door"}:${r.dimension || i}`),
			);
			collection(
				rows(a.shelfItems),
				rows(b.shelfItems),
				`${prefix}:shelf`,
				(r) => `${item} · ${String(r.description || "Shelf item")}`,
				["description", "qty", "unitPrice", "totalPrice"],
				(r, i) => String(r.id || r.productId || i),
			);
			for (const kind of ["mouldingRows", "serviceRows"])
				collection(
					rows(row(a.meta)[kind]),
					rows(row(b.meta)[kind]),
					`${prefix}:${kind}`,
					(r) =>
						`${item} · ${String(r.service || r.description || r.title || "Component")}`,
					[
						"service",
						"description",
						"qty",
						"unitPrice",
						"lineTotal",
						"taxxable",
					],
					(r, i) => String(r.uid || r.salesItemId || r.id || i),
				);
			collection(
				rows(a.formSteps).map((step) => ({
					...step,
					component:
						step.prodUid ||
						row(step.meta).selectedProdUids ||
						step.componentId ||
						null,
				})),
				rows(b.formSteps).map((step) => ({
					...step,
					component:
						step.prodUid ||
						row(step.meta).selectedProdUids ||
						step.componentId ||
						null,
				})),
				`${prefix}:step`,
				(r) =>
					`${item} · ${String(r.title || row(r.step).title || row(r.step).name || "Component")}`,
				["value", "component"],
				(r, i) => String(r.stepId || row(r.step).uid || i),
			);
			fields(
				row(a.housePackageTool),
				row(b.housePackageTool),
				["height", "doorType", "doorId", "jambSizeId", "casingId", "moldingId"],
				item,
				`${prefix}:configuration`,
			);
		},
	);
	collection(
		rows(before.extraCosts).filter((cost) => Number(cost.amount || 0) !== 0),
		rows(after.extraCosts).filter((cost) => Number(cost.amount || 0) !== 0),
		"cost",
		(r) => String(r.label || "Extra cost"),
		["amount", "type", "taxxable"],
		(r, i) => `${r.type}:${r.label || i}`,
	);
	return result;
}
export function parseSalesChangeRecord(
	value: unknown,
): SalesChangeRecord | null {
	const data = row(value);
	if (
		data.event !== "sales_form_change" ||
		data.schemaVersion !== 1 ||
		!Array.isArray(data.changes)
	)
		return null;
	return data as SalesChangeRecord;
}
export function salesChangeStatusLabel(status: string, failed = false) {
	if (failed && status === "APPROVED")
		return "Application failed · retry pending";
	return (
		(
			{
				APPROVED: "Approved · awaiting application",
				APPLYING: "Applying",
				APPLIED: "Applied",
				APPLIED_WITH_REVIEW: "Applied · operational review needed",
				STALE: "Needs a new review",
				FAILED: "Application failed",
				REJECTED: "Rejected",
				CANCELLED: "Cancelled",
				EXPIRED: "Expired",
				PENDING_CUSTOMER: "Awaiting customer approval",
			} as Record<string, string>
		)[status] || status
	);
}
