"use client";
import { useModal } from "@/components/common/modal/provider";
import type { IJobs } from "@/types/hrm";

import { Plus } from "lucide-react";
import { useSession } from "next-auth/react";

import { Button } from "@gnd/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";

import SubmitJobModal from "../_modals/submit-job-modal";

export default function SubmitJobBtn({
	disabled,
	disabledReason,
}: {
	disabled?: boolean;
	disabledReason?: string;
}) {
	const { data: session } = useSession({
		required: false,
	});
	const can = session?.can;
	const actions = [
		can?.viewTech && "punchout",
		can?.viewInstallation && "installation",
		can?.viewDecoShutterInstall && "Deco-Shutter",
	].filter(Boolean);
	const modal = useModal();
	function open(_type) {
		const type = _type?.toLowerCase();

		modal?.openModal(<SubmitJobModal job={{ type } as unknown as IJobs} />);
	}
	if (disabled) {
		return (
			<Button disabled size="sm" className="h-8" title={disabledReason}>
				<Plus className="mr-2 h-4 w-4" />
				<span>Job</span>
			</Button>
		);
	}
	if (actions.length === 1)
		return (
			<Button
				onClick={() => {
					open(actions?.[0]);
				}}
				size="sm"
				className="h-8"
			>
				<Plus className="mr-2 h-4 w-4" />
				<span>Task</span>
			</Button>
		);
	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button size="sm" className="h-8">
						<Plus className="mr-2 h-4 w-4" />
						<span>Job</span>
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent>
					{actions.map((a) => (
						<DropdownMenuItem
							onClick={() => {
								open(a);
							}}
							className="capitalize"
							key={a?.toString()}
						>
							{a}
						</DropdownMenuItem>
					))}
				</DropdownMenuContent>
			</DropdownMenu>
		</>
	);
}
