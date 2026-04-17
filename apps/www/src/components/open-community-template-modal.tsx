"use client";

import { useAuth } from "@/hooks/use-auth";
import { useCommunityTemplateParams } from "@/hooks/use-community-template-params";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { isCommunityUnitRole } from "@gnd/utils/constants";

export function OpenCommunityTemplateModal() {
	const { setParams } = useCommunityTemplateParams();
	const auth = useAuth();

	if (isCommunityUnitRole(auth.role?.name)) return null;

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
					New
				</Button>
			</div>
		</>
	);
}
