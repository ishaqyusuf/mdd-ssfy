import { constructMetadata } from "@gnd/utils/construct-metadata";
import { Client } from "./client";

export async function generateMetadata() {
  return constructMetadata({
    title: `Signup - GND Storefront`,
  });
}
export default async function Page() {
  return <Client />;
}
