"use client";

import { useSalesProfileFormParams } from "@/hooks/use-sales-profile-form-params";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";

export function ProfilesHeader() {
	const profileForm = useSalesProfileFormParams();

	return (
		<div className="flex items-center gap-4">
			<div className="flex-1" />
			<Button onClick={() => profileForm.openCreate()} type="button">
				<Icons.Add className="mr-2 size-4" />
				<span className="hidden lg:inline">New</span>
			</Button>
		</div>
	);
}
