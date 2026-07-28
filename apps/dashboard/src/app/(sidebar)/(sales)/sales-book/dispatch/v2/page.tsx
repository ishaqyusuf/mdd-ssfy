import { redirect } from "next/navigation";
import type { SearchParams } from "nuqs";

type Props = {
	searchParams: Promise<SearchParams>;
};

export default async function Page(props: Props) {
	const searchParams = await props.searchParams;
	const params = new URLSearchParams();

	for (const [key, value] of Object.entries(searchParams)) {
		if (Array.isArray(value)) {
			for (const item of value) {
				if (item != null) params.append(key, String(item));
			}
			continue;
		}

		if (value != null) params.set(key, String(value));
	}

	const query = params.toString();
	redirect(`/sales-book/dispatch${query ? `?${query}` : ""}`);
}
