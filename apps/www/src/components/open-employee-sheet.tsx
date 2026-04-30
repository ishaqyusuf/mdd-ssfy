import { useEmployeeParams } from "@/hooks/use-employee-params";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { AuthGuard } from "./auth-guard";
import { _perm } from "./sidebar/links";
import { useRolesParams } from "@/hooks/use-roles-params";

export function OpenEmployeeSheet() {
    const { setParams } = useEmployeeParams();
    const role = useRolesParams();
    return (
        <div className="flex gap-4">
            {/* <Button
                variant="outline"
                size="icon"
                onClick={() =>
                    setParams({
                        createEmployee: true,
                    })
                }
            >
                <Icons.Add />
            </Button> */}
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
            <AuthGuard rules={[_perm.is("editRole")]}>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                        role.setParams({
                            viewRoles: true,
                            primaryTab: "roles",
                        })
                    }
                >
                    <Icons.roles className="mr-2 size-4" />
                    Roles
                </Button>
            </AuthGuard>
        </div>
    );
}
