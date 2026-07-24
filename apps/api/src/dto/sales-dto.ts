import type {
	AddressBookMeta,
	QtyControlType,
	SalesDispatchStatus,
	SalesMeta,
	SalesType,
} from "@api/type";
import type { SalesListInclude } from "@api/utils/sales";
import {
	composeSalesStat,
	dispatchTitle,
	overallStatus,
	salesAddressLines,
	salesLinks,
} from "@api/utils/sales";
import type { Prisma } from "@gnd/db";
import { repairSalesInvoiceCccDisplay } from "@gnd/sales/payment-system";
import { getPrintPaymentFooterState } from "@gnd/sales/print/payment-footer-state";
import { deriveOrderProductionGateState } from "@gnd/sales/production-gate";
import { resolvePersistedSalesLineDoorRouteConfig } from "@gnd/sales/sales-form";
import { readSalesFormPo } from "@gnd/sales/sales-form/application/legacy-metadata";
import { getNameInitials, sum, toNumber } from "@gnd/utils";
import { timeAgo } from "@gnd/utils/dayjs";
import type { DeliveryOption } from "@gnd/utils/sales";
import { getSalesPriorityLabel, normalizeSalesPriority } from "@sales/priority";

export type Item = Prisma.SalesOrdersGetPayload<{
	include: typeof SalesListInclude;
}> & {
	items?: Array<{
		id: number;
		description: string | null;
		dykeDescription: string | null;
		qty: number | null;
		swing: string | null;
		total: number | null;
		meta?: unknown;
		formSteps?: Array<{
			title?: string | null;
			value: string | null;
			meta?: unknown;
			step?: {
				title?: string | null;
			} | null;
			component?: {
				meta?: unknown;
			} | null;
		}>;
		salesDoors?: Array<{
			dimension?: string | null;
			swing?: string | null;
			lhQty?: number | null;
			rhQty?: number | null;
			totalQty?: number | null;
			meta?: unknown;
		}>;
	}>;
	salesProfile?: {
		id: number;
		title: string | null;
	} | null;
	payments?: Array<{
		id?: number | null;
		amount: number | null;
		status: string | null;
		origin?: string | null;
		reviewStatus?: string | null;
		reviewedAt?: Date | null;
		reviewedById?: number | null;
		reviewMethod?: string | null;
		reviewedByAction?: string | null;
		deletedAt: Date | null;
		createdAt: Date | null;
		meta?: unknown;
		transaction?: { meta?: unknown; paymentMethod?: string | null } | null;
		squarePayments?: { meta?: unknown; paymentMethod?: string | null } | null;
	}>;
};
export function salesOrderDto(data: Item, bin?: boolean) {
	const deliveryOption: DeliveryOption =
		(data?.deliveryOption as any) || "pickup";
	const deliveriesWithItems =
		data?.deliveries?.filter((delivery) => !!delivery?._count?.items) || [];
	const prioritizedDelivery =
		deliveriesWithItems.find((delivery) => delivery.status === "completed") ||
		deliveriesWithItems[0];
	let deliveryStatus = prioritizedDelivery?.status as
		| SalesDispatchStatus
		| undefined;
	const d = data?.stat?.find(
		(d) => d.type == ("dispatchCompleted" as QtyControlType),
	);
	const status = overallStatus(data.stat);
	if (d?.percentage == 100 || deliveryStatus == "completed") {
		deliveryStatus = "completed";
		status.production.scoreStatus = null!;
		status.production.status = "completed";
	} else {
		deliveryStatus = status.delivery?.status as any;
	}

	// if (data.orderId == "04780AD") {

	// }
	let due = toNumber(data.amountDue);
	if (due <= 0) due = 0;
	return {
		...commonListData(data, bin),
		deliveryOption,
		deliveryStatus,
		dispatchList: data.deliveries?.map((d) => {
			return {
				title: dispatchTitle(d.id),
				id: d.id,
			};
		}),
		due,
		stats: statToKeyValueDto(data.stat),
		status,
		addressData: getSalesAddressData(data),
		statList: data.stat,
	};
}
export function salesQuoteDto(data: Item, bin?: boolean) {
	return {
		...commonListData(data, bin),
		addressData: getSalesAddressData(data),
	};
}

export function salesOverviewDto(data: Item, salesType: SalesType) {
	const overview =
		salesType === "quote" ? salesQuoteDto(data) : salesOrderDto(data);

	return {
		...overview,
		customerProfile: data.salesProfile
			? {
					id: data.salesProfile.id,
					title: data.salesProfile.title,
				}
			: null,
		taxSummary: {
			configured: data.taxes.length > 0,
			codes: Array.from(
				new Set(
					data.taxes
						.flatMap((tax) => [tax.taxCode, tax.taxConfig?.title])
						.filter((value): value is string => Boolean(value)),
				),
			),
		},
		shippingAddressConfigured: Boolean(
			data.shippingAddress?.address1?.trim() ||
				data.shippingAddress?.address2?.trim(),
		),
		overviewItems: salesOverviewItemsDto(data.items, true),
	};
}
function resolveSalesPaymentMethod(meta: unknown) {
	const record =
		meta && typeof meta === "object" && !Array.isArray(meta)
			? (meta as SalesMeta & Record<string, unknown>)
			: null;
	const newSalesForm =
		record?.newSalesForm &&
		typeof record.newSalesForm === "object" &&
		!Array.isArray(record.newSalesForm)
			? (record.newSalesForm as Record<string, unknown>)
			: null;
	const form =
		newSalesForm?.form &&
		typeof newSalesForm.form === "object" &&
		!Array.isArray(newSalesForm.form)
			? (newSalesForm.form as Record<string, unknown>)
			: null;
	const paymentMethod = form?.paymentMethod;
	const legacyPaymentMethod = record?.payment_option || record?.paymentOption;

	if (typeof paymentMethod === "string") return paymentMethod;
	return typeof legacyPaymentMethod === "string" ? legacyPaymentMethod : null;
}
function getAddressDto(
	data: Item["shippingAddress"],
	customer: Item["customer"],
	title,
) {
	if (!data) return { title, address: "No address set" };
	const meta: AddressBookMeta = data?.meta as any;
	return {
		id: data.id,
		title,
		name: data.name || customer?.businessName || customer?.name,
		phone: data.phoneNo || customer?.phoneNo,
		email: data.email || customer?.email,
		address: [data.address1 || customer?.address, meta?.zip_code]
			?.filter(Boolean)
			.join(" "),
		lines: salesAddressLines(data as any, customer as any),
	};
}

function getSalesAddressData(data: Item) {
	const customer = data.customer;
	const shipping = getAddressDto(
		data.shippingAddress || data.billingAddress,
		customer,
		"Shipping Address",
	);

	return {
		shipping: {
			...shipping,
			id: data.shippingAddress?.id ?? null,
		},
		billing: getAddressDto(data.billingAddress, customer, "Billing Address"),
	};
}

function salesOverviewItemsDto(
	items: Item["items"],
	includePreflightEvidence = false,
) {
	return (items || []).map((item) => {
		const firstStep = item.formSteps?.[0];
		const subtitle = [
			firstStep?.value || firstStep?.title || firstStep?.step?.title,
			item.swing,
		]
			.filter(Boolean)
			.join(" | ");

		const overviewItem = {
			id: item.id,
			title: item.description || item.dykeDescription || "Line item",
			subtitle,
			qty: Number(item.qty || 0),
			total: Number(item.total || 0),
		};
		if (!includePreflightEvidence) return overviewItem;
		const lineNoHandle =
			resolvePersistedSalesLineDoorRouteConfig(item).noHandle === true;

		return {
			...overviewItem,
			swing: item.swing,
			configurationSteps: (item.formSteps || []).map((step) => ({
				label: step.step?.title || step.title || null,
				value: step.value,
			})),
			doors: (item.salesDoors || []).map((door) => {
				const meta =
					door.meta &&
					typeof door.meta === "object" &&
					!Array.isArray(door.meta)
						? (door.meta as Record<string, unknown>)
						: null;
				const totalQty = Number(door.totalQty || 0);
				return {
					dimension: door.dimension,
					swing: door.swing,
					lhQty: Number(door.lhQty || 0),
					rhQty: Number(door.rhQty || 0),
					totalQty,
					noHandle: meta?.noHandle === true || lineNoHandle,
				};
			}),
		};
	});
}

function sumExactCostLineAmounts(
	costLines: Array<{
		label: string | null | undefined;
		amount: number | null | undefined;
	}>,
	targetLabel: string,
) {
	return costLines.reduce((total, line) => {
		if (String(line.label || "").toLowerCase() !== targetLabel.toLowerCase()) {
			return total;
		}

		return total + Number(line.amount || 0);
	}, 0);
}

function commonListData(data: Item, bin?: boolean) {
	const meta = (data.meta || {}) as any as SalesMeta;
	const gateState = deriveOrderProductionGateState({
		gate: data.productionGate,
		order: data,
	});
	const costLines: {
		label: string | null | undefined;
		amount: number | null | undefined;
	}[] = [];
	const _cost = (label, amount) => costLines.push({ label, amount });
	const paid = sum([data.grandTotal! - data.amountDue!]);
	const paymentMethod = resolveSalesPaymentMethod(meta);
	const invoiceCccDisplay = repairSalesInvoiceCccDisplay({
		baseTotal: data.grandTotal,
		paymentMethod,
		meta,
	});
	const paymentState = Array.isArray(data.payments)
		? getPrintPaymentFooterState(data as any)
		: null;
	_cost("Sub total", data.subTotal);
	data.extraCosts.map((e) => {
		_cost(e.label, e.totalAmount || e.amount);
	});
	data.taxes.map((t) => _cost(t.taxConfig?.title, t.tax));
	if (paymentState?.kind === "unpaid-card-estimate") {
		const charge = repairSalesInvoiceCccDisplay({
			baseTotal: paymentState.amountDue,
			paymentMethod: paymentState.selectedPaymentMethod,
			cccPercentage: paymentState.estimatedDueCharge?.percentage,
			meta,
		});
		_cost("Order Due Amount", paymentState.amountDue);
		if (charge.ccc) _cost("C.C.C", charge.ccc);
		_cost("Total Due With C.C.C", charge.totalWithCcc);
	} else if (paymentState?.kind === "paid-single-full-card") {
		const charge = paymentState.recordedCardCharges[0];
		if (charge?.cccAmount) _cost("C.C.C", charge.cccAmount);
		_cost(
			charge?.customerChargedAmount ? "Charged to Card" : "Paid",
			charge?.customerChargedAmount ?? paymentState.principalPaid,
		);
		_cost("Total Due", 0);
	} else if (paymentState?.kind === "paid-single-full-non-card") {
		_cost("Paid", paymentState.principalPaid);
		_cost("Total Due", 0);
	} else if (paymentState?.kind === "partial-or-mixed") {
		_cost("Order Total", paymentState.orderTotal);
		_cost("Paid Toward Order", paymentState.principalPaid);
		for (const charge of paymentState.recordedCardCharges) {
			_cost("Card Payment", charge.principalAmount);
			_cost("C.C.C on Card Payment", charge.cccAmount);
			_cost("Charged to Card", charge.customerChargedAmount);
		}
		_cost("Balance Due", paymentState.amountDue);
	} else if (invoiceCccDisplay.ccc > 0) {
		_cost(
			invoiceCccDisplay.cccPercentage > 0
				? `Credit Card Fee (${invoiceCccDisplay.cccPercentage}%)`
				: "Credit Card Fee",
			invoiceCccDisplay.ccc,
		);
		_cost("Total Invoice", data.grandTotal);
		_cost("Paid", paid);
		_cost("Due Amount", data.amountDue);
	} else {
		_cost("Total Invoice", data.grandTotal);
		_cost("Paid", paid);
		_cost("Due Amount", data.amountDue);
	}
	const cardPending = sumExactCostLineAmounts(
		costLines,
		"Total Due With C.C.C",
	);
	const cardCharged = sumExactCostLineAmounts(costLines, "Charged to Card");
	const hasLoadedPaymentRows = Array.isArray(data.payments);
	const pendingCccDisplay =
		!hasLoadedPaymentRows && Number(data.amountDue || 0) > 0
			? repairSalesInvoiceCccDisplay({
					baseTotal: data.amountDue,
					paymentMethod,
					cccPercentage: invoiceCccDisplay.cccPercentage,
					meta,
				})
			: null;
	const displayPending =
		cardPending ||
		pendingCccDisplay?.totalWithCcc ||
		Number(data.amountDue || 0);
	const displayPaid = cardCharged || paid;

	const customerId = data?.customer?.id;
	const accountNo = data.customer?.phoneNo
		? data.customer?.phoneNo
		: !customerId
			? null
			: `cust-${customerId}`;
	const salesStat = composeSalesStat(data.stat);
	return {
		// noteCount: data.noteCount,
		netTerm: data.paymentTerm,
		accountNo,
		createdAt: data?.createdAt,
		dueDate: data.paymentDueDate,
		id: data.id,
		orderId: data.orderId?.toUpperCase(),
		inboundStatus: data.inventoryStatus,
		isDealerSale: Number(data.dealerAuthId || 0) > 0,
		uuid: data.orderId,
		isDyke: data.isDyke,
		slug: data.slug,
		salesStat,
		address:
			data.shippingAddress?.address1 ||
			data.shippingAddress?.address2 ||
			data.billingAddress?.address1 ||
			data.billingAddress?.address2,
		displayName:
			data.customer?.businessName ||
			data.customer?.name ||
			data?.shippingAddress?.name,
		email: data.customer?.email,
		customerId: data.customer?.id,
		isBusiness: data.customer?.businessName,
		salesRepId: data.salesRepId,
		salesRep: data.salesRep?.name,
		salesRepInitial: getNameInitials(data.salesRep?.name!),
		poNo: readSalesFormPo(meta as any),
		paymentMethod,
		priority: normalizeSalesPriority(data.priority),
		priorityLabel: getSalesPriorityLabel(data.priority),
		deliveryOption: data?.deliveryOption,
		// taxes: data.taxes,
		// costLines: data.extraCosts,
		costLines,
		overviewItems: salesOverviewItemsDto(data.items),
		customerPhone:
			data.billingAddress?.phoneNo ||
			data.customer?.phoneNo ||
			data.shippingAddress?.phoneNo,
		salesDate: timeAgo(data.createdAt),
		links: salesLinks(data),
		shippingId: data.shippingAddressId,
		type: data.type as SalesType,
		isQuote: (data.type as SalesType) == "quote",
		orderStatus: data.status,
		prodStatus: data.prodStatus,
		productionGate: data.productionGate,
		hasProductionDefinition: gateState.hasProductionDefinition,
		productionGateStatus: gateState.productionGateStatus,
		productionGateTriggered: gateState.productionGateTriggered,
		invoice: {
			baseTotal: invoiceCccDisplay.baseTotal,
			displayCcc: invoiceCccDisplay.ccc,
			displayPaid,
			displayPending,
			displayTotal: invoiceCccDisplay.totalWithCcc,
			total: data.grandTotal,
			paid,
			pending: data.amountDue,
		},
	};
}
export function statToKeyValueDto(
	dataStats: Prisma.SalesStatGetPayload<{}>[],
	reset = false,
) {
	// const dataStats = data.stat;
	const k: { [k in QtyControlType]: Prisma.SalesStatGetPayload<{}> } =
		{} as any;
	dataStats?.map(({ score, percentage, total, ...rest }) => {
		if (reset) {
			score = percentage = total = 0;
		}
		k[rest.type] = {
			...rest,
			score,
			percentage,
			total,
		};
	});
	return k;
}
