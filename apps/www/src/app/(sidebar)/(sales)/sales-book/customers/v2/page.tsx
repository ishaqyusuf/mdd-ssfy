import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { redirect } from "next/navigation";
import type { SearchParams } from "nuqs";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
	return constructMetadata({
		title: "Sales Customers | GND",
	});
}

type Props = {
	searchParams: Promise<SearchParams>;
};

export default async function SalesCustomersV2Page(props: Props) {
	const searchParams = await props.searchParams;
	const params = new URLSearchParams();

	for (const [key, value] of Object.entries(searchParams)) {
		if (Array.isArray(value)) {
			for (const item of value) {
				params.append(key, item);
			}
			continue;
		}

		if (typeof value === "string") {
			params.set(key, value);
		}
	}

	const query = params.toString();
	redirect(query ? `/sales-book/customers?${query}` : "/sales-book/customers");
}
