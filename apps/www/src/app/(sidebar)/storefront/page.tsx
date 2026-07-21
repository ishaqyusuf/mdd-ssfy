import { constructMetadata } from "@gnd/utils/construct-metadata";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
	return constructMetadata({
		title: "Storefront | GND",
	});
}

export default function StorefrontPage() {
	redirect("/storefront/catalog");
}
