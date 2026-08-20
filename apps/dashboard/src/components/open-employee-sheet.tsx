import { useEmployeeParams } from "@/hooks/use-employee-params";
import { Button } from "@gnd/ui/button";
import { AuthGuard } from "./auth-guard";
import { _perm } from "./sidebar-links";

export function OpenEmployeeSheet() {
	const { setParams } = useEmployeeParams();
	return (
		<div className="flex gap-4">
			<AuthGuard rules={[_perm.is("editEmployee")]}>
				<Button
					variant="outline"
					size="sm"
					onClick={() =>
						setParams({
							createEmployee: true,
						})
					}
				>
					Create
				</Button>
			</AuthGuard>
		</div>
	);
}
