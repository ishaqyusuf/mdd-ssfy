import { useCart } from "@/hooks/use-cart";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";

export function OrderItemsSummary() {
  const cart = useCart();
  const items = cart.list;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Order</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="flex justify-between">
              <div>
                <p className="font-medium">{item.title}</p>
                <p className="text-sm text-gray-600">Qty: {item.qty}</p>
              </div>
              <p className="font-medium">${item.total.toFixed(2)}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
