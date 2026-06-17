import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Page(props: {
	searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
	const searchParams = await props.searchParams;
	const query = new URLSearchParams();

	for (const [key, value] of Object.entries(searchParams ?? {})) {
		if (Array.isArray(value)) {
			for (const item of value) {
				query.append(key, item);
			}
			continue;
		}

		if (value) {
			query.set(key, value);
		}
	}

	const queryString = query.toString();
	const suffix = queryString ? `?${queryString}` : "";
	redirect(`/sales-book/productions/v2${suffix}`);
}
