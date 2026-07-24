import { useCart } from "@/hooks/use-cart";

export function OrderSummary() {
  const cart = useCart();
  const estimate = cart.data?.estimate;
  if (!estimate) return;
	const { listSubtotal, promotionDiscount, subtotal, shipping, tax, total } =
		estimate;
  return (
    <div className="bg-gray-50 p-6 rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Order Summary</h3>
      <div className="space-y-2">
				{promotionDiscount > 0 ? (
					<>
						<div className="flex justify-between">
							<span>Merchandise</span>
							<span>${listSubtotal.toFixed(2)}</span>
						</div>
						<div className="flex justify-between font-medium text-red-700">
							<span>Promotion</span>
							<span>−${promotionDiscount.toFixed(2)}</span>
						</div>
					</>
				) : null}
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Shipping</span>
					<span>
						{shipping == null
							? "Calculated at checkout"
							: `$${shipping.toFixed(2)}`}
					</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Tax</span>
					<span>
						{tax == null ? "Calculated at checkout" : `$${tax.toFixed(2)}`}
					</span>
        </div>
        {total != null && (
          <div className="border-t pt-2 mt-2">
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
