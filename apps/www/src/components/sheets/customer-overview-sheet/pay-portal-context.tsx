import { createPaymentSchema } from "@/actions/schema";
import { useCustomerOverviewQuery } from "@/hooks/use-customer-overview-query";
import { useLoadingToast } from "@/hooks/use-loading-toast";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { formatMoney } from "@/lib/use-number";
import { sum } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { printSalesData } from "@/utils/sales-print-utils";
import type { TerminalCheckoutStatus } from "@gnd/square";
import { useEffect, useState } from "react";

import { useSalesQueryClient } from "@/hooks/use-sales-query-client";
import { useZodForm } from "@/hooks/use-zod-form";
import {
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@gnd/ui/tanstack";

export function usePayPortal() {
	const query = useCustomerOverviewQuery();
	const trpc = useTRPC();
	const queryClient = useQueryClient();

	const { data, isPending } = useSuspenseQuery(
		trpc.customers.getCustomerPayPortal.queryOptions({
			accountNo: query?.params?.accountNo,
		}),
	);
	const selections = query.params?.["pay-selections"];
	useEffect(() => {
		const amountDue = sum(
			data?.pendingSales?.filter((a) => selections?.includes(a.id)),
			"amountDue",
		);
		form.setValue("amount", formatMoney(amountDue), {
			shouldValidate: true,
		});
		form.setValue("_amount", formatMoney(amountDue), {
			shouldValidate: true,
		});
	}, [selections, data]);
	const form = useZodForm(createPaymentSchema, {
		defaultValues: {
			// terminal: null as CreateTerminalPaymentAction["resp"],
			paymentMethod: undefined,
			accountNo: query?.params?.accountNo,
			salesIds: query?.params?.["pay-selections"],
			amount: undefined,
			_amount: undefined,
			// squarePaymentId: undefined,
			// paymentMethod: tx.paymentMethod,
			// amount: tx.totalPay,
			checkNo: undefined,
			deviceId: undefined,
			enableTip: undefined,
			terminalPaymentSession: undefined,
		},
	});
	// const pToast = usePaymentToast();
	const toast = useLoadingToast();
	useEffect(() => {
		const selections = query.params?.["pay-selections"];
		form.setValue("salesIds", selections);
		form.setValue(
			"orderNos",
			data?.pendingSales
				?.filter((a) => selections?.includes(a.id))
				.map((a) => a.orderId),
		);
	}, [query.params?.["pay-selections"], data?.pendingSales, form]);
	const pm = form.watch("paymentMethod");
	const terminalPaymentSession = form.watch("terminalPaymentSession");
	const salesQ = useSalesOverviewQuery();
	const sq = useSalesQueryClient();
	const makePaymentMutation = useMutation(
		trpc.salesPaymentProcessor.applyPayment.mutationOptions({
			onSuccess: (data, variables) => {
				if (data?.terminalPaymentSession) {
					toast;
					//toast.loading("", toastDetail("terminal-waiting") as any);
					form.setValue("terminalPaymentSession", data.terminalPaymentSession);
					setTimeout(() => {
						setWaitSeconds(0);
					}, 2000);
				} else {
					if (data.status) {
						form.setValue("terminalPaymentSession", null);
						//toast.success("", toastDetail("payment-success") as any);
						sq.invalidate.salesList();
						query.setParams({
							"pay-selections": null,
							tab: "transactions",
						});
						setTimeout(() => {
							if (salesQ?.params?.["sales-overview-id"]) {
								salesQ.salesQuery.salesPaymentUpdated();
								query?.setParams(null);
							}
							const submittedOrderNos =
								variables &&
								typeof variables === "object" &&
								"orderNos" in variables
									? variables.orderNos
									: undefined;
							printSalesData({
								mode: "order-packing",
								slugs: submittedOrderNos?.join(","),
							});
						}, 1000);
					}
				}
			},
			onError(error) {
				staticPaymentData.description = error.message;
				//toast.error("", toastDetail("failed") as any);
			},
		}),
	);
	const makePayment = {
		...makePaymentMutation,
		execute: makePaymentMutation.mutate,
		isExecuting: makePaymentMutation.isPending,
	};
	const cancelTerminalPaymentMutation = useMutation(
		trpc.salesPaymentProcessor.cancelTerminalPayment.mutationOptions({
			onSuccess: () => {
				setWaitSeconds(null);
				form.setValue("terminalPaymentSession", null);
				//toast.success("", toastDetail("terminal-cancelled") as any);
				//  //toast.error("", toastDetail("terminal-cancelled"));
			},
			onError(e) {
				//toast.error("Unable to cancel payment");
			},
		}),
	);
	const cancelTerminalPayment = {
		...cancelTerminalPaymentMutation,
		execute: cancelTerminalPaymentMutation.mutate,
	};
	const [waitSeconds, setWaitSeconds] = useState(null);
	const [mockStatus, setMockStatus] = useState<TerminalCheckoutStatus>(null);
	function terminalManualAcceptPayment(e) {
		//toast.loading("", toastDetail("terminal-waiting") as any);
	}
	useEffect(() => {
		if (!terminalPaymentSession?.squareCheckoutId) return;
		async function checkTerminalPaymentStatus() {
			const rep = mockStatus
				? { status: mockStatus }
				: await queryClient.fetchQuery(
						trpc.salesPaymentProcessor.getTerminalPaymentStatus.queryOptions({
							checkoutId: terminalPaymentSession?.squareCheckoutId,
						}),
					);
			switch (rep.status) {
				case "COMPLETED":
					form.setValue("terminalPaymentSession.status", "COMPLETED");
					makePaymentMutation.mutate({
						...form.getValues(),
					});
					return null;
				case "CANCELED":
				case "CANCEL_REQUESTED":
					cancelTerminalPaymentMutation.mutate({
						checkoutId: terminalPaymentSession.squareCheckoutId,
						squarePaymentId: terminalPaymentSession.squarePaymentId,
					});
					return null;
			}
			// return generateRandomString();
			setTimeout(() => {
				setWaitSeconds(waitSeconds + 1);
			}, 2000);
		}
		if (waitSeconds != null) {
			checkTerminalPaymentStatus();
		}
	}, [
		cancelTerminalPaymentMutation.mutate,
		form,
		makePaymentMutation.mutate,
		mockStatus,
		queryClient,
		terminalPaymentSession,
		trpc.salesPaymentProcessor.getTerminalPaymentStatus,
		waitSeconds,
	]);
	staticPaymentData.accept = terminalManualAcceptPayment;
	// useEffect(() => {
	//     if (terminalPaymentSession) waitForTerminalPayment();
	// }, [terminalPaymentSession]);

	return {
		data,
		loading: isPending,
		selections,
		query,
		terminalPaymentSession,
		setMockStatus,
		form,
		makePayment,
		pm,
		toast: {
			toast,
			start() {
				//toast.loading("", toastDetail("loading") as any);
			},
		},
	};
}

const staticPaymentData = {
	description: null,
	accept: null,
};
