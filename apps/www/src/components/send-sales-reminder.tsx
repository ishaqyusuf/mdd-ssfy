import { getCustomerWalletId } from "@/actions/get-customer-wallet-id";
import { generateToken } from "@/actions/token-action";
import { _trpc } from "@/components/static-trpc";
import { useAuth } from "@/hooks/use-auth";
import { useTaskTrigger } from "@/hooks/use-task-trigger";
import { useZodForm } from "@/hooks/use-zod-form";
import { Button } from "@gnd/ui/button";
import { ButtonGroup } from "@gnd/ui/button-group";
import { Skeletons } from "@gnd/ui/custom/skeletons";
import { Form } from "@gnd/ui/form";
import { Icons } from "@gnd/ui/icons";
import { Label } from "@gnd/ui/label";
import { AlertDialog, InputGroup, Item } from "@gnd/ui/namespace";
import { useQuery } from "@gnd/ui/tanstack";
import { formatMoney, sum, uniqueList } from "@gnd/utils";
import type { SalesPrintModes } from "@sales/constants";
import { sendSalesEmail } from "@sales/utils/email";
import {
	type ReminderPayPlan,
	reminderPresetPayPlans,
	resolveReminderAmount,
} from "@sales/utils/reminder-pay-plan";
import type { ReactNode } from "react";
import { useEffect, useState, useTransition } from "react";
import { useFieldArray } from "react-hook-form";
import z from "zod";

interface Props {
	children?: ReactNode;
	salesIds: number[];
}

const reminderSaleSchema = z.object({
	ids: z.array(z.number()),
	salesNos: z.array(z.string()),
	includePaymentLink: z.boolean(),
	email: z.string().min(1),
	customerName: z.string().optional().nullable(),
	accountNo: z.string().optional().nullable(),
	type: z.string().optional().nullable(),
	amount: z.number(),
	dueAmount: z.number(),
	payPlan: z
		.union([z.number(), z.literal("full"), z.literal("custom")])
		.optional()
		.nullable(),
	percentage: z.number().optional().nullable(),
	preferredAmount: z.number().optional().nullable(),
});

const reminderSchema = z.object({
	sales: z.array(reminderSaleSchema),
});

const defaultValues: z.infer<typeof reminderSchema> = {
	sales: [],
};

export function SendSalesReminder({ children, salesIds }: Props) {
	const [opened, setOpened] = useState(false);
	const form = useZodForm(reminderSchema, {
		defaultValues,
	});
	const auth = useAuth();
	const trigger = useTaskTrigger({
		onStarted() {
			setOpened(false);
			form.reset(defaultValues);
		},
	});
	const [isTokenPending, startTransition] = useTransition();
	const { fields, update } = useFieldArray({
		control: form.control,
		name: "sales",
		keyName: "_id",
	});
	const watchedSales = form.watch("sales");
	const { data, isPending } = useQuery(
		_trpc.sales.getOrders.queryOptions(
			{
				salesIds,
			},
			{
				enabled: !!salesIds?.length && opened,
			},
		),
	);
	const {
		formState: { isValid },
	} = form;

	useEffect(() => {
		if (!data || isPending) return;

		form.reset({
			sales: uniqueList(
				data.data.map((sale) => {
					const common = data.data.filter((entry) =>
						sale.email ? entry.email === sale.email : entry.id === sale.id,
					);
					const dueAmount = sum(common, "due");

					return {
						ids: common.map((entry) => entry.id),
						salesNos: common.map((entry) => entry.orderId),
						dueAmount,
						amount: dueAmount,
						payPlan: "full" as const,
						percentage: null,
						preferredAmount: dueAmount,
						email: sale.email,
						customerName: sale.displayName,
						includePaymentLink: true,
						type: sale.type,
						accountNo: common.find((entry) => !!entry.accountNo)?.accountNo,
					};
				}),
				"email",
			),
		});
	}, [data, form, isPending]);

	const updateSale = (
		index: number,
		patch: Partial<z.infer<typeof reminderSaleSchema>>,
	) => {
		const current = watchedSales[index];
		if (!current) return;
		update(index, {
			...current,
			...patch,
		});
	};

	const selectPayPlan = (
		index: number,
		payPlan: ReminderPayPlan,
		preferredAmount?: number,
	) => {
		const current = watchedSales[index];
		if (!current) return;

		const nextPreferredAmount =
			payPlan === "custom"
				? (preferredAmount ?? current.preferredAmount ?? current.amount)
				: null;

		updateSale(index, {
			payPlan,
			percentage: typeof payPlan === "number" ? payPlan : null,
			preferredAmount: nextPreferredAmount,
			amount: resolveReminderAmount({
				due: current.dueAmount,
				payPlan,
				preferredAmount: nextPreferredAmount,
			}),
		});
	};

	const submit = async (data: z.infer<typeof reminderSchema>) => {
		startTransition(async () => {
			await sendSalesEmail({
				auth,
				trigger,
				tokenGeneratorFn: generateToken,
				data: await Promise.all(
					data.sales.map(async (sale) => {
						const walletId = await getCustomerWalletId(sale.accountNo);
						const mode = "order" as SalesPrintModes;

						return {
							mode,
							walletId,
							ids: sale.ids,
							amount: sale.includePaymentLink ? sale.amount : 0,
							dueAmount: sale.dueAmount,
							payPlan: sale.includePaymentLink ? sale.payPlan : null,
							preferredAmount: sale.includePaymentLink
								? sale.preferredAmount
								: null,
							percentage: sale.includePaymentLink ? sale.percentage : null,
							type: sale.type,
							customer: {
								name: sale.customerName || "Customer",
								email: sale.email,
							},
						};
					}),
				),
			});
		});
	};

	const isDisabled =
		trigger.isActionPending || !isValid || isPending || isTokenPending;

	return (
		<AlertDialog
			open={opened}
			onOpenChange={(nextOpen) => {
				setOpened(nextOpen);
			}}
		>
			<AlertDialog.Trigger asChild>
				{children || (
					<Button
						size="sm"
						variant="secondary"
						className="flex flex-1 items-center space-x-2 hover:bg-secondary"
					>
						<Icons.Notifications className="size-3.5" />
						<span>Remind</span>
					</Button>
				)}
			</AlertDialog.Trigger>
			<Form {...form}>
				<AlertDialog.Content className="min-w-max">
					<AlertDialog.Header>
						<AlertDialog.Title>Send Reminder</AlertDialog.Title>
						<AlertDialog.Description>
							Choose how much you want the customer to pay from this reminder.
						</AlertDialog.Description>
					</AlertDialog.Header>
					{isPending ? <Skeletons.Card /> : null}
					{fields.map((field, index) => {
						const sale = watchedSales[index] || field;
						const isCustom = sale.payPlan === "custom";

						return (
							<div key={field._id} className="grid gap-4 p-2">
								<Item variant="outline" size="sm">
									<Item.Content>
										<Item.Title>
											{sale.email || <div>set email</div>} {" | "}
											{sale.salesNos?.join(", ")}
										</Item.Title>
										<Item.Description>{sale.customerName}</Item.Description>

										<div className="grid gap-4 p-2">
											<div className="grid gap-2">
												<Label>Payment option</Label>
												<ButtonGroup>
													{reminderPresetPayPlans.map((payPlan) => (
														<Button
															key={payPlan}
															type="button"
															className="whitespace-nowrap"
															variant={
																sale.payPlan === payPlan
																	? "destructive"
																	: "outline"
															}
															size="sm"
															onClick={() => {
																selectPayPlan(index, payPlan);
															}}
														>
															{payPlan}%
														</Button>
													))}
													<Button
														type="button"
														className="whitespace-nowrap"
														variant={
															sale.payPlan === "full"
																? "destructive"
																: "outline"
														}
														size="sm"
														onClick={() => {
															selectPayPlan(index, "full");
														}}
													>
														Full
													</Button>
													<Button
														type="button"
														className="whitespace-nowrap"
														variant={isCustom ? "destructive" : "outline"}
														size="sm"
														onClick={() => {
															selectPayPlan(
																index,
																"custom",
																sale.preferredAmount ?? sale.amount,
															);
														}}
													>
														Custom
													</Button>
												</ButtonGroup>
											</div>

											<div className="grid gap-2">
												<Label>
													{isCustom ? "Preferred amount" : "Amount"}
												</Label>
												<InputGroup>
													<InputGroup.Input
														type="number"
														inputMode="decimal"
														min={0}
														max={sale.dueAmount}
														value={
															isCustom
																? (sale.preferredAmount ?? "")
																: sale.amount
														}
														placeholder="Amount"
														readOnly={!isCustom}
														onChange={(event) => {
															if (!isCustom) return;
															const rawValue = Number(event.target.value);
															const preferredAmount = Number.isFinite(rawValue)
																? Math.min(
																		Math.max(rawValue, 0),
																		sale.dueAmount,
																	)
																: 0;

															updateSale(index, {
																preferredAmount,
																amount: resolveReminderAmount({
																	due: sale.dueAmount,
																	payPlan: "custom",
																	preferredAmount,
																}),
															});
														}}
													/>
													<InputGroup.Addon align="inline-end">
														/${formatMoney(sale.dueAmount)}
													</InputGroup.Addon>
												</InputGroup>
											</div>
										</div>
									</Item.Content>
								</Item>
							</div>
						);
					})}
					<AlertDialog.Footer>
						<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
						<form
							onSubmit={form.handleSubmit(submit, (error) => {
								console.log(error);
							})}
						>
							<AlertDialog.Action
								type="submit"
								onClick={(event) => {
									event.preventDefault();
									void form.handleSubmit(submit)();
								}}
								disabled={isDisabled}
							>
								Send Reminder
							</AlertDialog.Action>
						</form>
					</AlertDialog.Footer>
				</AlertDialog.Content>
			</Form>
		</AlertDialog>
	);
}
