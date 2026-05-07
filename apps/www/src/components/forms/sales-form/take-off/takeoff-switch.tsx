import { SuperAdminGuard } from "@/components/auth-guard";
import { Label } from "@gnd/ui/label";
import { Switch } from "@gnd/ui/switch";

interface TakeoffSwitchProps {
	takeOff: boolean;
	takeOffChanged: (checked: boolean) => void;
}

export function TakeoffSwitch({
	takeOff,
	takeOffChanged,
}: TakeoffSwitchProps) {
	return (
		<SuperAdminGuard>
			<div className="flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3">
				<Switch
					onCheckedChange={takeOffChanged}
					checked={takeOff}
					id="takeOff"
				/>
				<Label
					htmlFor="takeOff"
					className="whitespace-nowrap text-xs font-semibold text-slate-700"
				>
					Take off
				</Label>
			</div>
		</SuperAdminGuard>
	);
}
