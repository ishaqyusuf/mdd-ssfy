import { Icons } from "@/components/_v1/icons";
import { ICan } from "@/types/auth";

function routeGroup(groupName, navs) {
    return {
        groupName,
        navs,
    };
}
function nav(title, icon, link, permissions: (keyof ICan)[]) {}
export default function useRoutes() {
    const routes = [
        nav("Dashboard", Icons.dashboard, "/dashboard", ["viewDashboard"]),
        // nav('Hrm')
    ];
}
