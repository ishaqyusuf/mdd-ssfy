import { constructMetadata } from "@gnd/utils/construct-metadata";
import { CheckoutPage } from "./client";
export async function generateMetadata() {
  return constructMetadata({
    title: "Cart - Millwork",
  });
}
export default async function CartPage() {
  return <CheckoutPage />;
}
