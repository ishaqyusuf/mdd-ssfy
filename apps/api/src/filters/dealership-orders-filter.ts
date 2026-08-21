import type { DealerPortalSalesListSchema } from "@api/schemas/dealer";
import type { TRPCContext } from "@api/trpc/init";
import type { PageFilterData } from "@api/type";
import { optionFilter } from "@api/utils/filter";
import {
	dealershipPaymentStateOptions,
	toDealershipFilterOptions,
	withDealershipDeliveryColors,
	withDealershipStatusColors,
} from "./dealership-filter-options";

type FilterKey = keyof DealerPortalSalesListSchema;
type FilterData = PageFilterData<FilterKey>;

const searchFilter = {
	label: "Search",
	type: "input",
	value: "q",
} satisfies PageFilterData<"q">;

export async function getDealershipOrdersFilter(
	ctx: TRPCContext,
	dealerId: number,
) {
	const orders = await ctx.db.salesOrders.findMany({
		where: {
			dealerAuthId: dealerId,
			deletedAt: null,
			type: {
				not: "quote",
			},
		},
		select: {
			orderId: true,
			status: true,
			deliveryOption: true,
			invoiceStatus: true,
			dealerSale: {
				select: {
					dealerCustomerProfile: {
						select: {
							id: true,
							title: true,
						},
					},
				},
			},
			customer: {
				select: {
					businessName: true,
					name: true,
					email: true,
					phoneNo: true,
				},
			},
			billingAddress: {
				select: {
					phoneNo: true,
				},
			},
		},
	});

	return [
		searchFilter,
		optionFilter(
			"customer.name",
			"Customer",
			toDealershipFilterOptions(
				orders.flatMap((order) => [
					order.customer?.businessName,
					order.customer?.name,
					order.customer?.email,
				]),
			),
		),
		optionFilter(
			"phone",
			"Phone",
			toDealershipFilterOptions(
				orders.flatMap((order) => [
					order.customer?.phoneNo,
					order.billingAddress?.phoneNo,
				]),
			),
		),
		optionFilter(
			"orderNo",
			"Order #",
			toDealershipFilterOptions(orders.map((order) => order.orderId)),
		),
		optionFilter(
			"status",
			"Status",
			withDealershipStatusColors(
				toDealershipFilterOptions(
					orders.map((order) => order.status || "open"),
				),
			),
		),
		optionFilter(
			"deliveryOption",
			"Delivery",
			withDealershipDeliveryColors(
				toDealershipFilterOptions(
					orders.map((order) => order.deliveryOption),
				),
			),
		),
		optionFilter(
			"customerProfileId",
			"Sales Profile",
			toDealershipFilterOptions(
				orders.map((order) =>
					order.dealerSale?.dealerCustomerProfile
						? `${order.dealerSale.dealerCustomerProfile.id}:${order.dealerSale.dealerCustomerProfile.title}`
						: null,
				),
			).map((option) => {
				const [id, ...labelParts] = option.value.split(":");
				return {
					label: labelParts.join(":") || option.label,
					value: id || option.value,
				};
			}),
		),
		optionFilter("paymentStatus", "Payment", dealershipPaymentStateOptions),
		optionFilter(
			"invoiceStatus",
			"Invoice Status",
			withDealershipStatusColors(
				toDealershipFilterOptions(
					orders.map((order) => order.invoiceStatus),
				),
			),
		),
	] satisfies FilterData[];
}
