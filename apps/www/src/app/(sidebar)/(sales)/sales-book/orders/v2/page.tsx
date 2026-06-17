import { redirect } from "next/navigation";
import type { SearchParams } from "nuqs";

type Props = {
	searchParams: Promise<SearchParams>;
};

export default async function SalesOrdersV2Page(props: Props) {
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
	redirect(query ? `/sales-book/orders?${query}` : "/sales-book/orders");
}
