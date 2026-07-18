import PageShell from "@/components/page-shell";
import { ScrollableContent } from "@/components/scrollable-content";
import { ShortLinksSettingsPage } from "@/components/settings/short-links-settings-page";
import { loadShortLinksFilterParams } from "@/hooks/use-short-links-filter-params";
import { loadSortParams } from "@/hooks/use-sort-params";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { getInitialTableSettings } from "@/utils/columns";
import type { RouterInputs } from "@api/trpc/routers/_app";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { constructMetadata } from "@gnd/utils/construct-metadata";
import type { SearchParams } from "nuqs";

export async function generateMetadata() {
	return constructMetadata({
		title: "Short Links | GND",
	});
}

type Props = {
	searchParams: Promise<SearchParams>;
};

export default async function Page(props: Props) {
	const searchParams = await props.searchParams;
	const filter = loadShortLinksFilterParams(searchParams);
	const { sort } = loadSortParams(searchParams);
	const initialSettings = await getInitialTableSettings("short-links");
	const queryInput = {
		...filter,
		size: 100,
		sort,
	} as RouterInputs["shortLinks"]["list"];

	batchPrefetch([
		trpc.shortLinks.list.infiniteQueryOptions(queryInput, {
			getNextPageParam: ({ meta }) =>
				(meta as { cursor?: string | number | null } | undefined)?.cursor,
		}),
	]);

	return (
		<PageShell>
			<HydrateClient>
				<ScrollableContent>
					<div className="flex flex-col gap-6">
						<PageTitle>Short Links</PageTitle>
						<ShortLinksSettingsPage initialSettings={initialSettings} />
					</div>
				</ScrollableContent>
			</HydrateClient>
		</PageShell>
	);
}
