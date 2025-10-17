import { constructMetadata } from "@gnd/utils/construct-metadata";
import { Cart } from "@/components/cart";
export async function generateMetadata() {
  return constructMetadata({
    title: "Cart - Millwork",
  });
}
export default async function CartPage() {
  return <Cart />;
}
