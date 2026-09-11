import { SalesRequestGenerationSettingsPage } from "@/components/settings/sales-request-generation-settings-page";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { constructMetadata } from "@gnd/utils/construct-metadata";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
	return constructMetadata({
		title: "Sales Request AI Settings | GND",
	});
}

export default async function Page() {
	await batchPrefetch([trpc.salesRequest.getAISettings.queryOptions()]);

	return (
		<HydrateClient>
			<section
				className="flex flex-col gap-6"
				aria-labelledby="sales-request-ai-settings-title"
			>
				<header>
					<h1
						id="sales-request-ai-settings-title"
						className="text-xl font-semibold"
					>
						Request generation
					</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Choose which AI provider and model interpret customer requests for
						the New Sales Form.
					</p>
				</header>
				<SalesRequestGenerationSettingsPage />
			</section>
		</HydrateClient>
	);
}
