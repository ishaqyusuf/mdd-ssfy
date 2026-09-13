import PageShell from "@/components/page-shell";
import { ScrollableContent } from "@/components/scrollable-content";
import { AssistantAccessSettingsPage } from "@/components/settings/assistant-access-settings-page";
import { PageTitle } from "@gnd/ui/custom/page-title";

export default function AssistantAdminPreviewPage() {
	const now = new Date("2026-09-13T12:00:00.000Z");
	return (
		<PageShell className="h-[calc(100vh-var(--header-height))] overflow-hidden">
			<ScrollableContent>
				<div className="mx-auto flex max-w-6xl flex-col gap-4">
					<div>
						<p className="text-sm font-medium text-muted-foreground">
							Settings / Assistant
						</p>
						<PageTitle>Assistant Administration</PageTitle>
						<p className="mt-1 text-sm text-muted-foreground">
							Control individual access without changing employee roles or
							business permissions.
						</p>
					</div>
					<AssistantAccessSettingsPage
						previewRows={[
							{
								id: 12,
								name: "Amara Okafor",
								email: "amara@gndmillwork.com",
								accessRevokedAt: null,
								assistantEntitlement: {
									enabled: true,
									expiresAt: null,
									reason: "Operations pilot",
									version: 2,
									updatedAt: now,
									updatedByUserId: 1,
									events: [],
								},
							},
							{
								id: 18,
								name: "David Chen",
								email: "david@gndmillwork.com",
								accessRevokedAt: null,
								assistantEntitlement: {
									enabled: true,
									expiresAt: new Date("2026-10-01T17:00:00.000Z"),
									reason: "Sales evaluation cohort",
									version: 1,
									updatedAt: now,
									updatedByUserId: 1,
									events: [],
								},
							},
							{
								id: 27,
								name: "Nina Patel",
								email: "nina@gndmillwork.com",
								accessRevokedAt: null,
								assistantEntitlement: null,
							},
							{
								id: 31,
								name: "Marcus Reed",
								email: "marcus@gndmillwork.com",
								accessRevokedAt: new Date("2026-09-10T12:00:00.000Z"),
								assistantEntitlement: {
									enabled: false,
									expiresAt: null,
									reason: "Account access revoked",
									version: 3,
									updatedAt: now,
									updatedByUserId: 1,
									events: [],
								},
							},
						]}
					/>
					<p className="text-center text-xs text-muted-foreground">
						Development preview using synthetic employee records. No account
						access is changed.
					</p>
				</div>
			</ScrollableContent>
		</PageShell>
	);
}
