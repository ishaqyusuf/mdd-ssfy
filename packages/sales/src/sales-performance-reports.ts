import { addMoney, roundMoney } from "./payment-system/domain/money";
import type {
	SalesWorkbookCell,
	SalesWorkbookColumn,
	SalesWorkbookReport,
	SalesWorkbookRow,
	SalesWorkbookSheet,
} from "./sales-workbook";

export const SALES_PERFORMANCE_REPORT_TYPES = [
	"performance-summary",
	"orders-ledger",
	"sales-reps",
	"products",
	"quote-activity",
	"customers",
] as const;

export type SalesPerformanceReportType =
	(typeof SALES_PERFORMANCE_REPORT_TYPES)[number];

export type SalesPerformanceReportColumn = SalesWorkbookColumn;
export type SalesPerformanceReportCell = SalesWorkbookCell;
export type SalesPerformanceReportRow = SalesWorkbookRow;
export type SalesPerformanceReportSheet = SalesWorkbookSheet;

export type SalesPerformanceOrderSource = {
	id: number;
	orderNo: string;
	createdAt: Date | null;
	customerId: number | null;
	customerName: string;
	salesRepId: number | null;
	salesRepName: string;
	salesChannel: string;
	status: string;
	priority: string;
	bookedSales: number;
};

export type SalesPerformanceQuoteSource = {
	id: number;
	quoteNo: string;
	createdAt: Date | null;
	goodUntil: Date | null;
	customerId: number | null;
	customerName: string;
	salesRepId: number | null;
	salesRepName: string;
	salesChannel: string;
	status: string;
	quoteValue: number;
};

export type SalesPerformanceLineItemSource = {
	id: number;
	orderNo: string;
	createdAt: Date | null;
	productId: number | null;
	customerName: string;
	salesRepName: string;
	description: string;
	quantity: number;
	bookedSales: number;
};

export type SalesPerformanceReportInput = {
	type: SalesPerformanceReportType;
	generatedAt?: Date;
	context: {
		from: Date;
		to: Date;
		salesRepNames?: string[] | null;
		salesChannels?: string[] | null;
	};
	summary: {
		bookedSales: number;
		orderCount: number;
		quoteCount: number;
		averageOrderValue: number;
		change: {
			bookedSales: number | null;
			orderCount: number | null;
			quoteCount: number | null;
			averageOrderValue: number | null;
		};
	};
	orders: SalesPerformanceOrderSource[];
	quotes: SalesPerformanceQuoteSource[];
	lineItems: SalesPerformanceLineItemSource[];
	trend: Array<{
		date: string;
		bookedSales: number;
		orderCount: number;
		averageOrderValue: number;
	}>;
};

export type SalesPerformanceWorkbookReport =
	SalesWorkbookReport<SalesPerformanceReportType>;

const definitions: Record<
	SalesPerformanceReportType,
	{ title: string; description: string; fileSlug: string }
> = {
	"performance-summary": {
		title: "Sales Performance Summary",
		description:
			"Executive sales metrics, trends, channels, representatives, and auditable source orders and quotes.",
		fileSlug: "performance-summary",
	},
	"orders-ledger": {
		title: "Orders Ledger",
		description:
			"Filtered sales orders with customer, representative, channel, status, priority, and booked value.",
		fileSlug: "orders-ledger",
	},
	"sales-reps": {
		title: "Sales by Representative",
		description:
			"Representative-level booked sales, order volume, and average order value with source orders.",
		fileSlug: "sales-by-representative",
	},
	products: {
		title: "Product Performance",
		description:
			"Product quantities, order coverage, and booked sales with source line items.",
		fileSlug: "product-performance",
	},
	"quote-activity": {
		title: "Quote Activity",
		description:
			"Filtered quotes with customer, representative, value, status, and expiration evidence.",
		fileSlug: "quote-activity",
	},
	customers: {
		title: "Sales by Customer",
		description:
			"Customer-level booked sales, order volume, and average order value with source orders.",
		fileSlug: "sales-by-customer",
	},
};

const contextColumns: SalesPerformanceReportColumn[] = [
	{ key: "field", label: "Report Context", type: "text", width: 24 },
	{ key: "value", label: "Value", type: "text", width: 46 },
];

const summaryColumns: SalesPerformanceReportColumn[] = [
	{ key: "bookedSales", label: "Booked Sales", type: "money", width: 18 },
	{ key: "orders", label: "Orders", type: "integer", width: 12 },
	{ key: "quotes", label: "Quotes", type: "integer", width: 12 },
	{
		key: "averageOrderValue",
		label: "Average Order Value",
		type: "money",
		width: 20,
	},
	{
		key: "bookedSalesChange",
		label: "Booked Sales Change %",
		type: "number",
		width: 22,
	},
	{
		key: "orderCountChange",
		label: "Order Count Change %",
		type: "number",
		width: 21,
	},
	{
		key: "quoteCountChange",
		label: "Quote Count Change %",
		type: "number",
		width: 21,
	},
	{
		key: "averageOrderValueChange",
		label: "AOV Change %",
		type: "number",
		width: 16,
	},
];

const ordersColumns: SalesPerformanceReportColumn[] = [
	{ key: "order", label: "Order", type: "text", width: 18 },
	{ key: "createdAt", label: "Created At", type: "date-time", width: 20 },
	{ key: "customerId", label: "Customer ID", type: "integer", width: 14 },
	{ key: "customer", label: "Customer", type: "text", width: 30 },
	{ key: "salesRepId", label: "Sales Rep ID", type: "integer", width: 14 },
	{ key: "salesRep", label: "Sales Rep", type: "text", width: 24 },
	{ key: "channel", label: "Channel", type: "text", width: 16 },
	{ key: "status", label: "Status", type: "text", width: 16 },
	{ key: "priority", label: "Priority", type: "text", width: 14 },
	{ key: "bookedSales", label: "Booked Sales", type: "money", width: 18 },
];

function aggregateColumns(
	key: string,
	label: string,
): SalesPerformanceReportColumn[] {
	return [
		{ key, label, type: "text", width: 30 },
		{ key: "orders", label: "Orders", type: "integer", width: 12 },
		{ key: "bookedSales", label: "Booked Sales", type: "money", width: 18 },
		{
			key: "averageOrderValue",
			label: "Average Order Value",
			type: "money",
			width: 20,
		},
	];
}

function isoDate(value: Date | null) {
	return value?.toISOString() || null;
}

function contextSheet(input: SalesPerformanceReportInput) {
	return {
		name: "Report Context",
		columns: contextColumns,
		rows: [
			{ field: "Period start", value: input.context.from.toISOString() },
			{ field: "Period end", value: input.context.to.toISOString() },
			{
				field: "Sales representatives",
				value: input.context.salesRepNames?.length
					? input.context.salesRepNames.join(", ")
					: "All visible sales representatives",
			},
			{
				field: "Sales channels",
				value: input.context.salesChannels?.length
					? input.context.salesChannels.join(", ")
					: "All sales channels",
			},
			{
				field: "Generated at",
				value: (input.generatedAt || new Date()).toISOString(),
			},
		],
	} satisfies SalesPerformanceReportSheet;
}

function summarySheet(input: SalesPerformanceReportInput) {
	return {
		name: "Summary",
		columns: summaryColumns,
		rows: [
			{
				bookedSales: roundMoney(input.summary.bookedSales),
				orders: input.summary.orderCount,
				quotes: input.summary.quoteCount,
				averageOrderValue: roundMoney(input.summary.averageOrderValue),
				bookedSalesChange: input.summary.change.bookedSales,
				orderCountChange: input.summary.change.orderCount,
				quoteCountChange: input.summary.change.quoteCount,
				averageOrderValueChange: input.summary.change.averageOrderValue,
			},
		],
	} satisfies SalesPerformanceReportSheet;
}

function orderRows(orders: SalesPerformanceOrderSource[]) {
	return orders.map((order) => ({
		order: order.orderNo,
		createdAt: isoDate(order.createdAt),
		customerId: order.customerId,
		customer: order.customerName,
		salesRepId: order.salesRepId,
		salesRep: order.salesRepName,
		channel: order.salesChannel,
		status: order.status,
		priority: order.priority,
		bookedSales: roundMoney(order.bookedSales),
	}));
}

function orderSheet(
	name: "Orders Ledger" | "Source Orders",
	orders: SalesPerformanceOrderSource[],
) {
	return {
		name,
		columns: ordersColumns,
		rows: orderRows(orders),
	} satisfies SalesPerformanceReportSheet;
}

function aggregateOrders(
	orders: SalesPerformanceOrderSource[],
	groupBy: "customer" | "salesRep" | "salesChannel",
) {
	const grouped = new Map<
		string,
		{ name: string; orders: number; bookedSales: number }
	>();

	for (const order of orders) {
		const group =
			groupBy === "customer"
				? {
						key:
							order.customerId === null
								? "customer:walk-in"
								: `customer:${order.customerId}`,
						name: order.customerName || "Walk-in customer",
					}
				: groupBy === "salesRep"
					? {
							key:
								order.salesRepId === null
									? "sales-rep:unassigned"
									: `sales-rep:${order.salesRepId}`,
							name: order.salesRepName || "Unassigned",
						}
					: {
							key: `sales-channel:${order.salesChannel || "direct"}`,
							name: order.salesChannel || "direct",
						};
		const current = grouped.get(group.key) || {
			name: group.name,
			orders: 0,
			bookedSales: 0,
		};
		current.orders += 1;
		current.bookedSales = addMoney(current.bookedSales, order.bookedSales);
		grouped.set(group.key, current);
	}

	return [...grouped.values()]
		.map((row) => ({
			...row,
			averageOrderValue: row.orders
				? roundMoney(row.bookedSales / row.orders)
				: 0,
		}))
		.sort(
			(a, b) => b.bookedSales - a.bookedSales || a.name.localeCompare(b.name),
		);
}

function aggregateSheet(
	name: string,
	key: string,
	label: string,
	rows: ReturnType<typeof aggregateOrders>,
) {
	return {
		name,
		columns: aggregateColumns(key, label),
		rows: rows.map((row) => ({
			[key]: row.name,
			orders: row.orders,
			bookedSales: row.bookedSales,
			averageOrderValue: row.averageOrderValue,
		})),
	} satisfies SalesPerformanceReportSheet;
}

function trendSheet(input: SalesPerformanceReportInput) {
	return {
		name: "Sales Trend",
		columns: [
			{ key: "date", label: "Period", type: "text", width: 20 },
			{
				key: "bookedSales",
				label: "Booked Sales",
				type: "money",
				width: 18,
			},
			{ key: "orders", label: "Orders", type: "integer", width: 12 },
			{
				key: "averageOrderValue",
				label: "Average Order Value",
				type: "money",
				width: 20,
			},
		],
		rows: input.trend.map((row) => ({
			date: row.date,
			bookedSales: roundMoney(row.bookedSales),
			orders: row.orderCount,
			averageOrderValue: roundMoney(row.averageOrderValue),
		})),
	} satisfies SalesPerformanceReportSheet;
}

function productSheets(input: SalesPerformanceReportInput) {
	const grouped = new Map<
		string,
		{
			description: string;
			quantity: number;
			bookedSales: number;
			orders: Set<string>;
		}
	>();

	for (const item of input.lineItems) {
		const description = item.description || "Unlabeled product";
		const productKey =
			item.productId === null
				? `line-item:${item.id}`
				: `product:${item.productId}`;
		const current = grouped.get(productKey) || {
			description,
			quantity: 0,
			bookedSales: 0,
			orders: new Set<string>(),
		};
		current.quantity += item.quantity;
		current.bookedSales = addMoney(current.bookedSales, item.bookedSales);
		current.orders.add(item.orderNo);
		grouped.set(productKey, current);
	}

	return [
		{
			name: "Product Performance",
			columns: [
				{ key: "product", label: "Product", type: "text", width: 36 },
				{ key: "quantity", label: "Quantity", type: "number", width: 14 },
				{ key: "orders", label: "Orders", type: "integer", width: 12 },
				{
					key: "bookedSales",
					label: "Booked Sales",
					type: "money",
					width: 18,
				},
			],
			rows: [...grouped.values()]
				.sort(
					(a, b) =>
						b.bookedSales - a.bookedSales ||
						a.description.localeCompare(b.description),
				)
				.map((row) => ({
					product: row.description,
					quantity: row.quantity,
					orders: row.orders.size,
					bookedSales: row.bookedSales,
				})),
		},
		{
			name: "Source Line Items",
			columns: [
				{ key: "order", label: "Order", type: "text", width: 18 },
				{ key: "createdAt", label: "Created At", type: "date-time", width: 20 },
				{ key: "customer", label: "Customer", type: "text", width: 30 },
				{ key: "salesRep", label: "Sales Rep", type: "text", width: 24 },
				{ key: "productId", label: "Product ID", type: "integer", width: 14 },
				{ key: "product", label: "Product", type: "text", width: 36 },
				{ key: "quantity", label: "Quantity", type: "number", width: 14 },
				{
					key: "bookedSales",
					label: "Booked Sales",
					type: "money",
					width: 18,
				},
			],
			rows: input.lineItems.map((item) => ({
				order: item.orderNo,
				createdAt: isoDate(item.createdAt),
				customer: item.customerName,
				salesRep: item.salesRepName,
				productId: item.productId,
				product: item.description,
				quantity: item.quantity,
				bookedSales: roundMoney(item.bookedSales),
			})),
		},
	] satisfies SalesPerformanceReportSheet[];
}

function quoteSheet(
	input: SalesPerformanceReportInput,
	name: "Quote Activity" | "Source Quotes" = "Quote Activity",
) {
	return {
		name,
		columns: [
			{ key: "quote", label: "Quote", type: "text", width: 18 },
			{ key: "createdAt", label: "Created At", type: "date-time", width: 20 },
			{ key: "goodUntil", label: "Expires At", type: "date-time", width: 20 },
			{ key: "customerId", label: "Customer ID", type: "integer", width: 14 },
			{ key: "customer", label: "Customer", type: "text", width: 30 },
			{ key: "salesRepId", label: "Sales Rep ID", type: "integer", width: 14 },
			{ key: "salesRep", label: "Sales Rep", type: "text", width: 24 },
			{ key: "channel", label: "Channel", type: "text", width: 16 },
			{ key: "status", label: "Status", type: "text", width: 16 },
			{ key: "quoteValue", label: "Quote Value", type: "money", width: 18 },
		],
		rows: input.quotes.map((quote) => ({
			quote: quote.quoteNo,
			createdAt: isoDate(quote.createdAt),
			goodUntil: isoDate(quote.goodUntil),
			customerId: quote.customerId,
			customer: quote.customerName,
			salesRepId: quote.salesRepId,
			salesRep: quote.salesRepName,
			channel: quote.salesChannel,
			status: quote.status,
			quoteValue: roundMoney(quote.quoteValue),
		})),
	} satisfies SalesPerformanceReportSheet;
}

export function buildSalesPerformanceReport(
	input: SalesPerformanceReportInput,
): SalesPerformanceWorkbookReport {
	const definition = definitions[input.type];
	const shared = [contextSheet(input), summarySheet(input)];
	let sheets: SalesPerformanceReportSheet[];
	let rowCount: number;

	switch (input.type) {
		case "performance-summary":
			sheets = [
				...shared,
				trendSheet(input),
				aggregateSheet(
					"Sales Channels",
					"salesChannel",
					"Sales Channel",
					aggregateOrders(input.orders, "salesChannel"),
				),
				aggregateSheet(
					"Sales Representatives",
					"salesRep",
					"Sales Representative",
					aggregateOrders(input.orders, "salesRep"),
				),
				orderSheet("Source Orders", input.orders),
				quoteSheet(input, "Source Quotes"),
			];
			rowCount = input.orders.length + input.quotes.length;
			break;
		case "orders-ledger":
			sheets = [...shared, orderSheet("Orders Ledger", input.orders)];
			rowCount = input.orders.length;
			break;
		case "sales-reps":
			sheets = [
				...shared,
				aggregateSheet(
					"Sales by Rep",
					"salesRep",
					"Sales Representative",
					aggregateOrders(input.orders, "salesRep"),
				),
				orderSheet("Source Orders", input.orders),
			];
			rowCount = input.orders.length;
			break;
		case "products":
			sheets = [...shared, ...productSheets(input)];
			rowCount = input.lineItems.length;
			break;
		case "quote-activity":
			sheets = [...shared, quoteSheet(input)];
			rowCount = input.quotes.length;
			break;
		case "customers":
			sheets = [
				...shared,
				aggregateSheet(
					"Sales by Customer",
					"customer",
					"Customer",
					aggregateOrders(input.orders, "customer"),
				),
				orderSheet("Source Orders", input.orders),
			];
			rowCount = input.orders.length;
			break;
	}

	return {
		type: input.type,
		title: definition.title,
		description: definition.description,
		fileSlug: definition.fileSlug,
		generatedAt: input.generatedAt || new Date(),
		rowCount,
		sheets,
	};
}
