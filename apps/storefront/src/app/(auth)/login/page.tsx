import { constructMetadata } from "@gnd/utils/construct-metadata";
import { Client } from "./client";

export async function generateMetadata() {
  return constructMetadata({
    title: `Login - GND Storefront`,
  });
}
export default async function Page() {
  return <Client />;
}
