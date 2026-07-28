"use client";

import { useAuth } from "@/hooks/use-auth";
import { useCommunityTemplateParams } from "@/hooks/use-community-template-params";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { isCommunityUnitRestrictedAccess } from "@gnd/utils/constants";

export function OpenCommunityTemplateModal() {
	const { setParams } = useCommunityTemplateParams();
	const auth = useAuth();

	if (isCommunityUnitRestrictedAccess(auth.can)) return null;

	return (
		<>
			<div>
				<Button
					onClick={(e) => {
						setParams({
							createTemplate: true,
						});
					}}
				>
					<Icons.Add className="mr-2" />
					<span className="hidden lg:inline">New</span>
				</Button>
			</div>
		</>
	);
}
