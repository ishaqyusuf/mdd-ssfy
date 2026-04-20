import { prisma } from "@/db";
import { getCustomerWallet } from "@gnd/sales/wallet";
import { formatPaymentParams } from "@gnd/utils/sales";
import { tokenize } from "@gnd/utils/tokenizer";
import { addDays } from "date-fns";
import { redirect } from "next/navigation";
import LegacySquarePaymentPage from "./legacy-square-payment-page";

type PageProps = {
	params: Promise<{
		emailToken: string;
		orderIds: string;
	}>;
	searchParams: Promise<{
		uid?: string | string[];
	}>;
};

function getRedirectUid(uid?: string | string[]) {
	if (Array.isArray(uid)) return uid[0];
	return uid;
}

async function buildLegacyCheckoutToken(params: {
	emailToken: string;
	orderIds: string;
}) {
	const { emailToken, orderIds } = formatPaymentParams(params);
	const orders = await prisma.salesOrders.findMany({
		where: {
			slug: {
				in: orderIds,
			},
			deletedAt: null,
			OR: [
				{
					customer: {
						email: {
							startsWith: emailToken,
						},
					},
				},
				{
					billingAddress: {
						email: {
							startsWith: emailToken,
						},
					},
				},
			],
		},
		select: {
			id: true,
			amountDue: true,
			customer: {
				select: {
					id: true,
					phoneNo: true,
					walletId: true,
				},
			},
		},
	});

	if (orders.length !== orderIds.length) {
		return null;
	}

	const payableOrders = orders.filter((order) => Number(order.amountDue || 0) > 0);
	if (!payableOrders.length) {
		return null;
	}

	const primaryOrder = payableOrders[0];
	const accountNo =
		primaryOrder?.customer?.phoneNo ||
		(primaryOrder?.customer?.id ? `cust-${primaryOrder.customer.id}` : null);
	const walletId =
		primaryOrder?.customer?.walletId ||
		(accountNo ? (await getCustomerWallet(prisma, accountNo)).id : null);

	if (!walletId) {
		return null;
	}

	return tokenize({
		salesIds: payableOrders.map((order) => order.id),
		expiry: addDays(new Date(), 7).toISOString(),
		payPlan: "full",
		amount: payableOrders.reduce(
			(sum, order) => sum + Number(order.amountDue || 0),
			0,
		),
		walletId,
	});
}

export default async function Page(props: PageProps) {
	const params = await props.params;
	const searchParams = await props.searchParams;
	const redirectUid = getRedirectUid(searchParams.uid);

	if (redirectUid) {
		const token = await buildLegacyCheckoutToken(params);
		if (token) {
			redirect(`/checkout/${encodeURIComponent(token)}/v2`);
		}
	}

	return <LegacySquarePaymentPage params={Promise.resolve(params)} />;
}
