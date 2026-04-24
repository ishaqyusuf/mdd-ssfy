"use client";

import { Button } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@gnd/ui/dialog";
import { Icons } from "@gnd/ui/icons";
import { Label } from "@gnd/ui/label";

type Props = {
	open: boolean;
	paymentMethod?: string | null;
	paymentMethods: string[];
	onOpenChange: (open: boolean) => void;
	onSelectPaymentMethod: (method: string) => void;
	onDontAskAgainChange: (checked: boolean) => void | Promise<void>;
};

export function PaymentMethodReviewDialog({
	open,
	paymentMethod,
	paymentMethods,
	onOpenChange,
	onSelectPaymentMethod,
	onDontAskAgainChange,
}: Props) {
	const hasPaymentMethod = Boolean(paymentMethod);
	const description = hasPaymentMethod
		? "This sale has not received a payment yet. Review the selected payment method before continuing."
		: "This sale has not received a payment yet and does not have a payment method selected.";

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<div className="mb-2 flex size-10 items-center justify-center rounded-full bg-amber-100 text-amber-700">
						<Icons.CreditCard className="size-5" />
					</div>
					<DialogTitle>Review payment method</DialogTitle>
					<DialogDescription>{description}</DialogDescription>
				</DialogHeader>

				<div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
					{paymentMethods.map((method) => {
						const selected = paymentMethod === method;
						return (
							<button
								key={method}
								type="button"
								onClick={() => onSelectPaymentMethod(method)}
								className={[
									"rounded-full border px-3 py-2 text-sm font-medium transition",
									selected
										? "border-primary bg-primary text-primary-foreground shadow-sm"
										: "border-border bg-muted/40 text-foreground hover:border-primary/50 hover:bg-muted",
								].join(" ")}
							>
								{method}
							</button>
						);
					})}
				</div>

				<div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
					<Checkbox
						id="payment-method-review-dismiss"
						onCheckedChange={(checked) =>
							onDontAskAgainChange(Boolean(checked))
						}
					/>
					<Label
						htmlFor="payment-method-review-dismiss"
						className="text-sm font-medium"
					>
						Don't ask me again for this sale
					</Label>
				</div>

				<DialogFooter>
					<Button type="button" onClick={() => onOpenChange(false)}>
						Done
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
