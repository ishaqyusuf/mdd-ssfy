import { useEmployeeParams } from "@/hooks/use-employee-params";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { AuthGuard } from "./auth-guard";
import { _perm } from "./sidebar/links";
import { Menu } from "./(clean-code)/menu";
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
                <Menu>
                    <Menu.Item
                        onClick={(e) => {
                            role.setParams({
                                viewRoles: true,
                                primaryTab: "roles",
                            });
                        }}
                        icon="roles"
                    >
                        Roles
                    </Menu.Item>
                </Menu>
            </AuthGuard>
        </div>
    );
}

