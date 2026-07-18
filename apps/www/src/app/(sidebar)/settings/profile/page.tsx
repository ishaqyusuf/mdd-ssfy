import { UserLoggedInDevices } from "@/components/user-logged-in-devices";
import { UserProfileInfo } from "@/components/user-profile-info";

import PageShell from "@/components/page-shell";
import { getInitialTableSettings } from "@/utils/columns";

export default async function Page() {
	const loggedInDevicesSettings = await getInitialTableSettings(
		"user-logged-in-devices",
	);

	return (
		<PageShell>
			<div className="flex-1 space-y-6 p-4 pt-6 md:p-8">
				<div>
					<h2 className="text-2xl font-bold tracking-tight">My Profile</h2>
					<p className="text-muted-foreground">
						Manage your account settings and preferences.
					</p>
				</div>
				<UserProfileInfo />
				<div>
					<h3 className="mb-4 text-lg font-semibold">Active Sessions</h3>
					<UserLoggedInDevices initialSettings={loggedInDevicesSettings} />
				</div>
			</div>
		</PageShell>
	);
}
