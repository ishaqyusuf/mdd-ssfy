import { getSalesResolutionData } from "@/actions/get-sales-resolution-data";
import { DataSkeletonProvider } from "@/hooks/use-data-skeleton";
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
	const r = useResolutionCenterParams();
	const data = useAsyncMemo(async () => {
		await timeout(300);
		const r = await getSalesResolutionData(sale?.id);
		return r;
	}, [sale?.id, r.params?.refreshToken]);
	const paymentSkeleton = {
		history: [
			{
				id: "skeleton-history",
				createdAt: new Date(),
				status: "pending",
				reason: "",
				authorName: "",
				description: "",
			},
		],
	};
	const paymentRows = skeletonListData(data?.payments, 3, paymentSkeleton);
	return (
		<CardContent className="pt-0">
			<div className="space-y-4">
				<div className="grid grid-cols-1 gap-4 rounded-lg bg-muted/30 p-4 md:grid-cols-4">
					<div>
						<Label className="text-xs text-muted-foreground">Grand Total</Label>
						<div className="text-lg font-semibold">
							<Money value={sale?.total} />
						</div>
					</div>
					<div>
						<Label className="text-xs text-muted-foreground">Amount Paid</Label>
						<div className="text-lg font-semibold text-green-600">
							<Money value={sale?.paid} />
						</div>
					</div>
					<div>
						<Label className="text-xs text-muted-foreground">Stored Due</Label>
						<div
							className={`text-lg font-semibold ${sale.due > 0 ? "text-red-600" : "text-green-600"}`}
						>
							<Money value={sale.due} />
						</div>
					</div>
					<div>
						<Label className="text-xs text-muted-foreground">
							Projected Due
						</Label>
						<div
							className={`text-lg font-semibold ${sale.calculatedDue > 0 ? "text-amber-600" : "text-green-600"}`}
						>
							<Money value={sale.calculatedDue} />
						</div>
					</div>
				</div>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<Card className="p-4">
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
					<Card className="p-4">
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
					<h4 className="font-semibold mb-3">Payment History</h4>
					<DataSkeletonProvider value={{ loading: !data?.salesId }}>
						<div className="space-y-3">
							{paymentRows.map((payment) => (
								<Card
									key={`${payment.id ?? payment.paymentNo ?? payment.createdAt ?? payment.status}`}
									className="p-4"
								>
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-4">
											<div className="flex items-center gap-2">
												<Icon
													Icon={
														PaymentMethodIcon[
															(payment.paymentMethod ||
																"cash") as keyof typeof PaymentMethodIcon
														] || PaymentMethodIcon.cash
													}
													className=""
												/>

												<span className="font-medium capitalize">
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
											<div className="flex items-center gap-2">
												<StatusIcon status={payment.status} />
												<DataSkeleton as="span" pok="textSm">
													<Progress>
														<Progress.Status>{payment.status}</Progress.Status>
													</Progress>
												</DataSkeleton>
												<span className="mr-4 uppercase text-xs font-semibold">
													{payment?.reason}
												</span>
											</div>
										</div>
										<div className="flex items-center gap-4">
											<div className="text-right">
												<div className="font-semibold">
													<Money value={payment?.amount} />
												</div>
												<div className="text-xs text-muted-foreground">
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
									<div>
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
														className="text-xs text-muted-foreground flex items-center gap-2"
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
