import { getSalesResolutionData } from "@/actions/get-sales-resolution-data";
import {
	DataSkeletonProvider,
	type useCreateDataSkeletonCtx,
} from "@/hooks/use-data-skeleton";
import { useResolutionCenterParams } from "@/hooks/use-resolution-center-params";
import { timeout } from "@/lib/timeout";
import { formatDate } from "@/lib/use-day";
import { skeletonListData } from "@/utils/format";
import { Card, CardContent } from "@gnd/ui/card";
import { Icon, PaymentMethodIcon, StatusIcon } from "@gnd/ui/icons";
import { Label } from "@gnd/ui/label";
import { useAsyncMemo } from "use-async-memo";
import { Progress } from "../(clean-code)/progress";
import Money from "../_v1/money";
import { DataSkeleton } from "../data-skeleton";
import type { Item } from "./resolution-center-content";
import { ResolutionDialog } from "./resolution-dialog";

export function SalesData({
	sale,
	recommendedAction,
	dueMismatch,
}: {
	sale: Item;
	recommendedAction: string;
	dueMismatch: boolean;
}) {
	type Payment = NonNullable<
		Awaited<ReturnType<typeof getSalesResolutionData>>
	>["payments"][number];
	const r = useResolutionCenterParams();
	const data = useAsyncMemo(async () => {
		await timeout(300);
		const r = await getSalesResolutionData(sale?.id);
		return r;
	}, [sale?.id, r.params?.refreshToken]);
	const paymentSkeleton: Partial<Payment> = {
		history: [
			{
				id: 0,
				createdAt: new Date(),
				status: "pending",
				reason: "",
				authorName: "",
				description: "",
			},
		],
	};
	const paymentRows = skeletonListData(data?.payments, 3, paymentSkeleton);
	const skeletonContext = {
		loading: !data?.salesId,
	} as unknown as ReturnType<typeof useCreateDataSkeletonCtx>;
	return (
		<CardContent className="px-3 pb-3 pt-0 md:px-6 md:pb-6">
			<div className="space-y-3 md:space-y-4">
				<div className="grid grid-cols-2 gap-2 rounded-md bg-muted/30 p-3 md:grid-cols-4 md:gap-4 md:rounded-lg md:p-4">
					<div>
						<Label className="text-xs text-muted-foreground">Grand Total</Label>
						<div className="text-base font-semibold md:text-lg">
							<Money value={sale?.total} />
						</div>
					</div>
					<div>
						<Label className="text-xs text-muted-foreground">Amount Paid</Label>
						<div className="text-base font-semibold text-green-600 md:text-lg">
							<Money value={sale?.paid} />
						</div>
					</div>
					<div>
						<Label className="text-xs text-muted-foreground">Stored Due</Label>
						<div
							className={`text-base font-semibold md:text-lg ${sale.due > 0 ? "text-red-600" : "text-green-600"}`}
						>
							<Money value={sale.due} />
						</div>
					</div>
					<div>
						<Label className="text-xs text-muted-foreground">
							Projected Due
						</Label>
						<div
							className={`text-base font-semibold md:text-lg ${sale.calculatedDue > 0 ? "text-amber-600" : "text-green-600"}`}
						>
							<Money value={sale.calculatedDue} />
						</div>
					</div>
				</div>
				<div className="grid grid-cols-1 gap-2 md:grid-cols-2 md:gap-4">
					<Card className="rounded-md p-3 md:rounded-lg md:p-4">
						<Label className="text-xs text-muted-foreground">
							Conflict status
						</Label>
						<div className="mt-2 flex items-center gap-2">
							<StatusIcon status={sale.status || "pending"} />
							<span className="font-medium capitalize">
								{sale.status || "No conflict"}
							</span>
						</div>
						<p className="mt-2 text-sm text-muted-foreground">
							{dueMismatch
								? "The stored balance does not match the projection from current successful payments."
								: "The order balance and payment projection are already aligned."}
						</p>
					</Card>
					<Card className="rounded-md p-3 md:rounded-lg md:p-4">
						<Label className="text-xs text-muted-foreground">
							Recommended next action
						</Label>
						<div className="mt-2 text-sm font-medium">{recommendedAction}</div>
						<p className="mt-2 text-sm text-muted-foreground">
							Use the resolution action that restores the correct due amount and
							keeps customer follow-up clear.
						</p>
					</Card>
				</div>
				<div>
					<h4 className="mb-2 text-sm font-semibold md:mb-3 md:text-base">
						Payment History
					</h4>
					<DataSkeletonProvider value={skeletonContext}>
						<div className="space-y-2 md:space-y-3">
							{paymentRows.map((payment) => (
								<Card
									key={`${payment.id ?? payment.paymentNo ?? payment.createdAt ?? payment.status}`}
									className="rounded-md p-3 md:rounded-lg md:p-4"
								>
									<div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-center md:justify-between">
										<div className="flex min-w-0 flex-col gap-2 md:flex-row md:items-center md:gap-4">
											<div className="flex min-w-0 items-center gap-2">
												<Icon
													Icon={
														PaymentMethodIcon[
															(payment.paymentMethod ||
																"cash") as keyof typeof PaymentMethodIcon
														] || PaymentMethodIcon.cash
													}
													className=""
												/>

												<span className="min-w-0 truncate font-medium capitalize">
													<DataSkeleton as="span" pok="textSm">
														{payment.paymentMethod?.replace("-", " ")}
													</DataSkeleton>
												</span>
												{(payment.checkNo || !data?.salesId) && (
													<DataSkeleton as="span" pok="textSm">
														<span className="text-sm text-muted-foreground">
															#{payment.checkNo}
														</span>
													</DataSkeleton>
												)}
											</div>
											<div className="flex min-w-0 items-center gap-2">
												<StatusIcon status={payment.status} />
												<DataSkeleton as="span" pok="textSm">
													<Progress>
														<Progress.Status>{payment.status}</Progress.Status>
													</Progress>
												</DataSkeleton>
												<span className="min-w-0 truncate text-xs font-semibold uppercase md:mr-4">
													{payment?.reason}
												</span>
											</div>
										</div>
										<div className="flex min-w-0 items-center justify-between gap-3 md:justify-end md:gap-4">
											<div className="min-w-0 text-left md:text-right">
												<div className="font-semibold">
													<Money value={payment?.amount} />
												</div>
												<div className="truncate text-xs text-muted-foreground">
													{formatDate(payment?.createdAt)} •{" "}
													{payment.authorName}
												</div>
											</div>
											<DataSkeleton pok="textLg">
												<ResolutionDialog
													payment={payment}
													currentDue={sale.due}
													currentCalculatedDue={sale.calculatedDue}
													conflictStatus={sale.status}
													recommendedAction={recommendedAction}
													refundableAmount={
														sale?.due < 0
															? Math.min(sale.due * -1, payment.amount)
															: 0
													}
													// onResolve={(action, reason, note) =>
													//     handleResolve(
													//         sale.id,
													//         payment.id,
													//         action,
													//         reason,
													//         note,
													//     )
													// }
												/>
											</DataSkeleton>
										</div>
									</div>
									<div className="mt-2 text-sm text-muted-foreground">
										<span>{payment?.history?.[0]?.description}</span>
									</div>
									{payment.history.length > 0 && (
										<div className="mt-3 pt-3 border-t">
											<Label className="text-xs text-muted-foreground">
												History
											</Label>
											<div className="mt-1 space-y-1">
												{payment.history.map((entry) => (
													<div
														key={`${entry.id ?? entry.createdAt}-${entry.status}-${entry.reason}`}
														className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-muted-foreground md:gap-2"
													>
														<StatusIcon status={entry.status} />
														<span>
															<DataSkeleton pok="textSm">
																{formatDate(entry.createdAt)}
															</DataSkeleton>
														</span>
														<span>•</span>
														<span className="capitalize">
															<DataSkeleton pok="textSm">
																{entry.status}
															</DataSkeleton>
														</span>
														<span>•</span>
														<span className="uppercase">
															<DataSkeleton pok="textSm">
																{entry.reason?.split("-")?.join(" ")}
															</DataSkeleton>
														</span>
														{(entry.authorName || !data?.salesId) && (
															<>
																<span>•</span>
																<span>
																	by{" "}
																	<DataSkeleton as={"span"} pok="textSm">
																		{entry.authorName}
																	</DataSkeleton>
																</span>
															</>
														)}
														{(entry.description || !data?.salesId) && (
															<>
																<span>•</span>
																<span>
																	<DataSkeleton pok="textSm">
																		{entry.description}
																	</DataSkeleton>
																</span>
															</>
														)}
													</div>
												))}
											</div>
										</div>
									)}
								</Card>
							))}
						</div>
					</DataSkeletonProvider>
				</div>
			</div>
		</CardContent>
	);
}
