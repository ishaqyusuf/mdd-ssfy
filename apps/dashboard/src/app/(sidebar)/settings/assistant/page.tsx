import { getLoggedInProfile } from "@/actions/cache/get-loggedin-profile";
import PageShell from "@/components/page-shell";
import { ScrollableContent } from "@/components/scrollable-content";
import { AssistantAccessSettingsPage } from "@/components/settings/assistant-access-settings-page";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { constructMetadata } from "@gnd/utils/construct-metadata";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = constructMetadata({
	title: "Assistant Administration | GND",
});

export default async function AssistantAdministrationPage() {
	const profile = await getLoggedInProfile();
	if (profile.role?.toLowerCase() !== "super admin") redirect("/");
	return (
		<PageShell className="h-[calc(100vh-var(--header-height))] overflow-hidden">
			<ScrollableContent>
				<div className="flex flex-col gap-4">
					<PageTitle>Assistant Administration</PageTitle>
					<AssistantAccessSettingsPage />
				</div>
			</ScrollableContent>
		</PageShell>
	);
}
