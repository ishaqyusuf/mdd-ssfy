import { SpecialOrderSettingsSection } from "@/components/settings/special-order-settings-section";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { Badge } from "@gnd/ui/badge";
import { constructMetadata } from "@gnd/utils/construct-metadata";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
	return constructMetadata({
		title: "Special Order Settings | GND",
	});
}

export default async function Page() {
	await batchPrefetch([trpc.sales.getPrintSettings.queryOptions()]);

	return (
		<HydrateClient>
			<section
				className="space-y-6"
				aria-labelledby="special-orders-settings-title"
			>
				<header>
					<div className="flex items-center gap-2">
						<h1
							id="special-orders-settings-title"
							className="text-xl font-semibold"
						>
							Special orders
						</h1>
						<Badge variant="secondary">Super Admin</Badge>
					</div>
					<p className="mt-1 text-sm text-muted-foreground">
						Configure customer acknowledgment, secure-link lifetime, and the
						company-wide operations gate.
					</p>
				</header>
				<SpecialOrderSettingsSection />
			</section>
		</HydrateClient>
	);
}
