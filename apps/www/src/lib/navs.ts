import { Icons } from "@/components/_v1/icons";
import { env } from "@/env.mjs";
import { ICan } from "@/types/auth";
import { Session } from "next-auth";

function _route(title, icon, path, isNew = false) {
    return { title, icon, path, isNew };
}
type Route = { title; icon; path; isNew?: boolean };
interface ISidebarRoute {
    title?;
    routes: Route[];
}
export interface ISidebar {
    routeGroup: ISidebarRoute[];
    totalRoutes?;
    homeRoute;
    noSideBar: Boolean;
    flatRoutes: Route[];
    CommunitySettings: Route[];
    Hrm: Route[];
    Job: Route[];
}
export function nav(
    session: Session | null,
    isProd = true,
): ISidebar | undefined {
    if (!session?.user) return undefined;
    const prodQuery = ``;

    const __can = session?.can;
    const role:
        | "Production"
        | "Punchout"
        | "1099 Contractor"
        | "DECO-SHUTTER INSTALLER"
        | "Customer Service" = session?.role?.name as any;
    const {
        viewProject,
        viewProduction,
        viewBuilders,
        viewInvoice,
        viewOrders,
        editOrders,
        editProject,
        viewHrm,
        viewEmployee,
        viewDelivery,
        viewPickup,
        viewPriceList,
        viewCustomerService,
        viewInstallation,
    }: ICan = __can;
    const routes: {
        [key in
            | "Dashboard"
            | "Community"
            | "Sales"
            | "Services"
            | "Hrm"
            | "Job"
            | "Singles"
            | "Contractor"
            | "Settings"]: Route[];
    } = {
        Dashboard: [],
        Hrm: [],
        Job: [],
        Services: [],
        Singles: [],
        Contractor: [],
        Community: [],
        Sales: [],
        Settings: [
            _route("Profile Settings", Icons.Settings2, "/settings/profile"),
        ],
    };
    const isAdmin = session.role?.name == "Admin";
    if (isAdmin) {
        routes.Dashboard.push(
            _route("Dashboard", Icons.Dashboard, "/dashboard"),
        );
        routes.Settings.push(
            _route("Sales", Icons.SalesSettings, "/settings/sales"),
        );
    }
    if (editOrders) {
        routes.Settings.push(_route("Email", Icons.Email, "/settings/email"));
    }
    if (viewProject) {
        routes.Community.push(
            ...[
                _route("Projects", Icons.Project, "/community/projects"),
                _route("Units", Icons.Units, "/community/units"),
            ],
        );
    }
    viewProduction &&
        role != "Production" &&
        routes.Community.push(
            _route("Productions", Icons.Production, "/community/productions"),
        );
    viewInvoice &&
        routes.Community.push(
            _route("Invoices", Icons.CommunityInvoice, "/community/invoices"),
        );

    if (role == "Production") {
        routes.Services.push(
            _route(
                "Sales Production",
                Icons.Production,
                `/tasks/sales-productions`,
                // `/tasks/sales-productions${prodQuery}`
            ),
            _route(
                "Unit Production",
                Icons.Production,
                "/tasks/unit-productions",
            ),
        );
    }
    if (!isAdmin) {
        if (viewInstallation) {
            routes.Services.push(
                _route("Installations", Icons.Tasks, "/tasks/installations"),
            );
            routes.Services.push(
                _route("Payments", Icons.Payment, "/payments"),
            );
        }
        if (__can.viewTech) {
            routes.Services.push(
                _route("Punchout", Icons.Punchout, "/jobs/punchouts"),
            );
            routes.Services.push(
                _route("Payments", Icons.Payment, "/payments"),
            );
        }
        if (__can.viewDecoShutterInstall) {
            routes.Services.push(
                _route("Installations", Icons.Tasks, "/jobs/installations"),
            );
            routes.Services.push(
                _route("Payments", Icons.Payment, "/payments"),
            );
        }
    }
    if (viewCustomerService) {
        routes.Services.push(
            _route(
                "Customer Service",
                Icons.CustomerService,
                "/customer-services",
            ),
        );
    }
    if (__can.viewCommission)
        routes.Singles.push(
            _route("Sales Commission", Icons.Percent, "/sales/commissions"),
        );
    const Hrm: Route[] = [];

    let _hrm = (() => {
        const _rw: any = {};
        let href: any = null;
        function setHref(title, _href) {
            if (!href) href = _href;
            _rw[_href] = _route(title, Icons.Hrm, `/hrm/${_href}`);
        }
        if (viewHrm || viewEmployee) {
            setHref("Employees", "employees");
            setHref("Profile", "profiles");
            setHref("Roles", "roles");
        }
        Hrm.push(...(Object.values(_rw) as any));
        if (href) return _route("Hrm", Icons.Hrm, `/hrm/${href}`);
        return null;
    })();

    if (_hrm) routes.Hrm.push(_hrm);
    const { rl: Job, route: jRoute } = groupedNavs({
        action(setHref) {
            if (viewProject && viewInvoice) {
                setHref("Jobs", "");
                setHref("Payment Receipts", "payments");
                setHref("Pending Payments", "payments/pay");
            }
        },
        basePath: "/contractor/jobs",
        Icon: Icons.Jobs,
        // Group: routes.Job,
        // single: true,
        groupName: "Jobs",
    });

    if (viewOrders || isAdmin) {
        routes.Sales.push(
            ...[
                _route(
                    "Quotes",
                    Icons.Estimates,
                    `/sales-book/quotes`,
                    // `/sales/estimates?_salesRepId=${session.user.id}`
                ), //employees,roles
                _route("Orders", Icons.Orders, `/sales-book/orders`),
                _route("Customers", Icons.User, "/sales/customers"),
                _route("Dealers", Icons.Delivery, "/sales-v2/dealers", true),
                _route("Dispatch", Icons.Delivery, "/sales-v2/dispatch", true),
            ],
        );
    } else {
        if (__can.viewOrderProduction)
            routes.Sales.push(
                _route(
                    "Productions",
                    Icons.Production,
                    `/sales-v2/productions`,
                ),
            );
    }

    if ((viewDelivery || viewPickup) && !viewOrders)
        routes.Sales.push(
            _route(
                "Order Dispatch",
                Icons.Delivery,
                "/sales-v2/dispatch",
                true,
            ),
        );
    // if (viewPickup && !viewOrders)
    //     routes.Sales.push(
    //         _route("Order Pickup", Icons.Delivery, "/sales/pickup")
    //     );
    if (editOrders)
        routes.Sales.push(
            ...([
                // _route("Sales Jobs", Briefcase, "/sales/jobs"),
                _route("Products", Icons.Products, "/sales-v2/products"),
                __can.viewOrderPayment &&
                    _route("Accounting", Icons.Reciept, "/sales/accounting"),
                _route("Catalogs", Icons.Products, "/sales/catalogs"),
                _route(
                    "Productions",
                    Icons.Production,
                    `/sales-v2/productions`,
                ),

                // _route("Pending Stocks", CircleDot, "/sales/pending-stocks"),
            ].filter(Boolean) as any),
        );
    if (__can.viewInboundOrder)
        routes.Sales.push(_route("Inbounds", Icons.Inbound, `/sales/inbounds`));
    const { rl: ContractorNavs } = groupedNavs({
        action(setHref) {
            __can.viewJobs && setHref("Jobs", "jobs");
            __can.viewAssignTasks && setHref("Assign Tasks", "assign-tasks");
            __can.viewDocuments && setHref("Contractors", "contractors");
        },
        basePath: "/contractor",
        Icon: Icons.Jobs,
        Group: routes.Contractor,
        groupName: "Contractors",
    });
    const CommunitySettings: Route[] = [];
    let _communitySettings = (() => {
        const _rw: any = {};
        let href: any = null;
        function setHref(title, _href) {
            href = _href;
            _rw[_href] = _route(
                title,
                Icons.CommunitySettings,
                `/settings/community/${_href}`,
            );
        }
        if (editProject) {
            setHref("Install Costs", "install-costs");
            setHref("Model Costs", "model-costs");
            setHref("Community Cost", "community-costs");
        }
        if (editProject) {
            // setHref("Model Templates", "model-templates");
            setHref("Community Templates", "community-templates");
        }
        if (viewBuilders) setHref("Builders", "builders");
        CommunitySettings.push(
            ...[
                _rw.builders,
                _rw["community-templates"],
                _rw["install-costs"],
                _rw["community-costs"],
                _rw["model-costs"],
                // _rw["model-templates"],
            ].filter(Boolean),
        );
        if (href)
            return _route(
                "Community",
                Icons.CommunitySettings,
                `/settings/community/${href}`,
            );
        return null;
    })();
    if (_communitySettings) routes.Settings.push(_communitySettings);

    let routeGroup: { routes: Route[]; title }[] = [];
    let totalRoutes = 0;
    let flatRoutes: Route[] = [];
    let homeRoute = null;
    Object.entries(routes).map(([title, r]) => {
        let len = r?.length;
        if (len == 0) return;
        totalRoutes += len;
        if (!homeRoute) homeRoute = r?.[0]?.path;
        flatRoutes.push(...r);
        const __routes = r
            .filter(
                (route, index) =>
                    r.findIndex((fr) => fr.title == route.title) == index,
            )
            .filter(Boolean) as Route[];
        routeGroup.push({
            title: len < 2 ? null : title,
            routes: __routes,
        });
    });
    routeGroup = routeGroup?.filter(
        (sec) => (sec.routes as any)?.length > 0,
    ) as any;
    if (session.role?.name == "Dealer") homeRoute = "/orders";
    // if (__can?.editOrders)
    //     homeRoute = "/sales-rep";
    return {
        flatRoutes,
        routeGroup,
        // totalRoutes < 6 ? [{ routes: flatRoutes, title: "" }] : routeGroup,
        totalRoutes,
        homeRoute: homeRoute || "/login",
        noSideBar: totalRoutes < 6,
        CommunitySettings,
        Hrm,
        Job,
    };
}
function groupedNavs({
    action,
    basePath,
    Icon,
    Group,
    single,
    groupName,
}: {
    action;
    basePath;
    Icon;
    Group?;
    single?: Boolean;
    groupName;
}) {
    const _rw: any = {};
    let href: any = null;

    const rl: Route[] = [];
    function setHref(title, _href, _Icon?, permission = true) {
        if (!permission) return;
        if (!href) href = `${basePath}/${_href}`;
        const r = (_rw[_href] = _route(
            title,
            _Icon || Icon,
            `${basePath}/${_href}`,
        ));
        if (Group && !single) Group.push(r);
    }
    action(setHref);
    rl.push(...(Object.values(_rw) as any));
    let route: any = null;
    if (href) {
        route = _route(groupName, Icon, href);
        if (single && Group) Group.push(route);
    }
    return { rl, route };
}
const isProd = env.NEXT_PUBLIC_NODE_ENV == "production";
export const upRoutes = [
    "Dashboard",
    !isProd && "Community",
    !isProd && "Hrm",
    !isProd && "Services",
    !isProd && "Settings",
    // !isProd && "Community/Units",
    // !isProd && "Community/C"/,
    "Sales/Estimates",
    "Sales/Orders",
    "Sales/Customers",
    "Sales/Productions",
    "Services/Sales Production",
    "Settings/Sales",
    "Settings/Profile",
];
