import { GuardedPackingSettingsPage } from "@/components/settings/guarded-packing-settings-page";
import { SalesHandoffTriggerSettingsPage } from "@/components/settings/sales-handoff-trigger-settings-page";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { constructMetadata } from "@gnd/utils/construct-metadata";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
    return constructMetadata({
        title: "Sales Operations Settings | GND",
    });
}

export default async function Page() {
    await batchPrefetch([
        trpc.sales.getSalesHandoffTrigger.queryOptions(),
        trpc.sales.getGuardedPackingSettings.queryOptions(),
    ]);

    return (
        <HydrateClient>
            <section
                className="space-y-6"
                aria-labelledby="operations-settings-title"
            >
                <header>
                    <h1
                        id="operations-settings-title"
                        className="text-xl font-semibold"
                    >
                        Operations
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Choose when payment makes an order ready for operational
                        handoff.
                    </p>
                </header>
                <SalesHandoffTriggerSettingsPage />
                <GuardedPackingSettingsPage />
            </section>
        </HydrateClient>
    );
}
