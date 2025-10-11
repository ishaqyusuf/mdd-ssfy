import { ICan, PermissionScope } from "@/types/auth";
import z from "zod";

import { IconKeys } from "../_v1/icons";
import { schema } from "./context";
import { sum } from "@/lib/utils";
// import va from "@/lib/va";

type moduleNames = "HRM" | "Sales" | "Community" | "Inventory";
const _module = (
    name: moduleNames,
    icon: IconKeys,
    // title?,
    subtitle?,
    sections: ReturnType<typeof _section>[] = [],
) => ({
    name,
    icon,
    title: name,
    subtitle,
    sections,
    index: -1,
    activeLinkCount: 0,
    activeSubLinkCount: 0,
    defaultLink: null,
});
// type sectionNames = "main" | "sales";
export type LinkItem = {
    name;
    title;
    href?;
    paths?: string[];
    level?;
    show?: boolean;
    globalIndex?;
    index?;
    access?;
    // links?: {
    //     name;
    //     link: string;
    //     title;
    // }[];
};
const _section = (
    name: string,
    title?: string,
    links?: (ReturnType<typeof _link>["data"] | undefined)[],
    access: Access[] = [],
) => ({
    name,
    title,
    links: links.filter(Boolean).map((a) => a),
    access,
    index: -1,
    globalIndex: -1,
    linksCount: 0,
});
// type linkNames = "HRM" | "customer-services" | "Dashboard" | "Sales";
const _subLink = (name, href, access?: Access[]) =>
    _link(name, null, href, null, access);

const _link = (
    name, //: linkNames,
    // title?: string,
    icon?: IconKeys,
    href?,
    subLinks: LinkItem[] = [],
    access: Access[] = [],
) => {
    const res = {
        name,
        title: name?.split("-").join(" "),
        icon,
        href,
        subLinks,
        access,
        index: -1,
        globalIndex: -1,
        show: false,
        paths: [],
        level: null,
    };
    const ctx = {
        data: res,
        level(level) {
            res.level = level;
            return ctx;
        },
        access(...access: Access[]) {
            res.access = access;
            return ctx;
        },
        childPaths(...paths) {
            res.paths = paths?.map((p) => (p?.startsWith("/") ? p : `/${p}`));
            return ctx;
        },
    };
    return ctx;
};
export type Access = {
    type: "role" | "permission"; // | "userId";
    equator: "is" | "isNot" | "in" | "notIn" | "every" | "some";
    values: string[];
};
export const __access = (
    type: Access["type"],
    equator: Access["equator"],
    ...values
) => ({ type, equator, values }) as Access;

type Role = "Admin" | "Production" | "1099 Contractor" | "Super Admin";
export const _role = {
    is: (role: Role) => __access("role", "is", role),
    isNot: (role: Role) => __access("role", "isNot", role),
    in: (...roles: Role[]) => __access("role", "in", ...roles),
    notIn: (...roles: Role[]) => __access("role", "notIn", ...roles),
    every: (...roles: Role[]) => __access("role", "every", ...roles),
    some: (...roles: Role[]) => __access("role", "some", ...roles),
};
export const _perm = {
    is: (role: PermissionScope) => __access("permission", "is", role),
    isNot: (role: PermissionScope) => __access("permission", "isNot", role),
    in: (...roles: PermissionScope[]) => __access("permission", "in", ...roles),
    notIn: (...roles: PermissionScope[]) =>
        __access("permission", "notIn", ...roles),
    every: (...roles: PermissionScope[]) =>
        __access("permission", "every", ...roles),
    some: (...roles: PermissionScope[]) =>
        __access("permission", "some", ...roles),
};
export function validateRules(accessList: Access[], can?, userId?, role?) {
    if (!can) can = {};
    return accessList.every((a) => {
        switch (a.type) {
            // case "userId":
            //     return Number(a.values[0]) == userId;
            //     break;
            case "permission":
                switch (a.equator) {
                    case "every":
                    case "is":
                        return a.values?.every((p) => can?.[p]);
                    case "in":
                    case "some":
                        return a.values?.some((p) => can?.[p]);
                    case "isNot":
                    case "notIn":
                        return a.values.every((p) => !can?.[p]);
                }
                break;
            case "role":
                switch (a.equator) {
                    case "every":
                    case "is":
                        return a.values?.every((p) => role === p);
                    case "in":
                    case "some":
                        return a.values?.some((p) => role === p);
                    case "isNot":
                    case "notIn":
                        return a.values.every((p) => role !== p);
                }
                break;
        }

        return true;
    });
}
export const validateLinks = ({
    role,
    can,
    userId,
}: {
    role;
    can: ICan;
    userId;
}) => {
    const validateAccess = (al) => validateRules(al, can, userId, role);
    return linkModules.map((lm) => {
        lm.sections = lm.sections.map((s) => {
            s.links = s.links.map((lnk) => {
                const valid = validateAccess(lnk.access);
                lnk.show = valid;
                // if(!valid)return
                if (lnk.subLinks?.length)
                    lnk.subLinks = lnk.subLinks.map((sl) => {
                        sl.show = validateAccess(sl.access);
                        return sl;
                    });
                if (
                    !lnk?.access?.length &&
                    lnk.subLinks?.length &&
                    lnk?.subLinks?.every((s) => !s.show)
                )
                    lnk.show = false;
                return lnk;
            });

            return s;
        });
        return lm;
    });
};
type NavType = z.infer<typeof schema>;
const profileSection = _section("settings", null, [
    _link("Profile Settings", "settings2", "/settings/profile").data,
    _link(
        "Site Actions",
        "Notification",
        "/settings/site-action-notifications",
    ).access(_role.is("Super Admin")).data,
]);
export const linkModules = [
    _module("HRM", "hrm", "GND HRM", [
        _section("", null, [
            // _link("HRM", "hrm", "/").access(_perm.in("viewHrm")).data,
            _link("Employees", "employees", "/hrm/employees").access(
                _perm.some("viewHrm", "viewEmployee"),
            ).data,
            // _link("Profile", "profile", "/hrm/profiles").access(
            //     _perm.some("viewHrm", "viewEmployee"),
            // ).data,
            // _link("Roles", "roles", "/hrm/roles").access(_perm.some("viewRole"))
            //     .data,
        ]),
        _section("", null, [
            _link("Jobs", "jobs", "/contractor/jobs").access(
                _perm.every("viewProject", "viewInvoice", "viewJobs"),
            ).data,
            _link(
                "Payment Receipts",
                "payment",
                "/contractor/jobs/payments",
            ).access(
                _perm.every("viewProject", "viewInvoice", "viewJobPayment"),
            ).data,
            _link(
                "Pending Payments",
                "pendingPayment",
                "/contractor/jobs/payments/pay",
            ).access(
                _perm.every("viewProject", "viewInvoice", "viewJobPayment"),
            ).data,
        ]),
        // profileSection,
    ]),
    _module(null, null, null, [
        _section("", null, [
            _link("Dashboard", "dashboard", "/production/dashboard").access(
                _role.is("Production"),
            ).data,
        ]),
    ]),
    _module("Community", "communityInvoice", "GND Community", [
        _section("main", null, [
            _link("Customer Service", "customerService", "/customer-services")
                .access(_perm.is("viewCustomerService"))
                .level(7).data,
        ]),
        _section("main", null, [
            _link("Dashboard", "dashbord2", "/community", [
                _subLink("Projects", "/community")
                    .access
                    // _perm.is("editProject"),
                    ().data,
                _subLink("Units", "/community/project-units")
                    .access
                    // _perm.is("editProject"),
                    ().data,
                _subLink("Productions", "/community/project-units")
                    .access
                    // _perm.is("editProject"),
                    ().data,
                _subLink("Templates", "/community/templates")
                    .access
                    // _perm.is("editProject"),
                    ().data,
                _subLink("Invoices", "/community/invoices")
                    .access
                    // _perm.is("editProject"),
                    ().data,
                _subLink("Builders", "/community/builders")
                    .access
                    // _perm.is("editProject"),
                    ().data,
            ])
                .access(_role.is("Super Admin"))
                .level(7)
                .childPaths(
                    "community/model-template",
                    "community/template-schema",
                ).data,
        ]),
        _section("main", null, [
            _link("Projects", "project", "/community/projects").access(
                _perm.in("viewProject"),
            ).data,
            _link("Units", "units", "/community/units").access(
                _perm.in("viewProject"),
            ).data,
            _link("Productions", "production", "/community/productions").access(
                _perm.in("viewProduction"),
                _role.isNot("Production"),
            ).data,
            _link("Invoices", "communityInvoice", "/community/invoices").access(
                _perm.in("viewInvoice"),
            ).data,
        ]),
        _section("main", null, [
            _link(
                "Sales Production",
                "production",
                "/sales-book/production-tasks",
            ).access(_role.is("Production")).data,
            _link(
                "Unit Production",
                "production",
                "/tasks/unit-productions",
            ).access(_role.is("Production")).data,
            _link("Installations", "tasks", "/tasks/installations").access(
                _role.is("1099 Contractor"),
                _perm.is("viewInstallation"),
            ).data,
            _link("Payments", "payment", "/payments").access(
                _role.is("1099 Contractor"),
                _perm.is("viewInstallation"),
            ).data,

            _link("Punchout", "punchout", "/jobs/punchouts").access(
                _role.isNot("Admin"),
                _perm.is("viewTech"),
            ).data,
            _link("Payments", "payment", "/payments").access(
                _role.isNot("Admin"),
                _perm.is("viewTech"),
            ).data,
            _link("Installations", "tasks", "/jobs/installations").access(
                _role.isNot("Admin"),
                _perm.is("viewDecoShutterInstall"),
            ).data,
            _link("Payments", "payment", "/payments").access(
                _role.isNot("Admin"),
                _perm.is("viewDecoShutterInstall"),
            ).data,

            _link("Sales Commission", "percent", "/sales/commissions").access(
                _perm.is("viewCommission"),
            ).data,
        ]),
        _section("settings", "Settings", [
            _link("Community Setting", "settings", null, [
                _subLink(
                    "Install Costs",
                    "/settings/community/install-costs",
                ).access(_perm.is("editProject")).data,
                _subLink(
                    "Model Costs",
                    "/settings/community/model-costs",
                ).access(_perm.is("editProject")).data,
                _subLink(
                    "Community Cost",
                    "/settings/community/community-costs",
                ).access(_perm.is("editProject")).data,
                _subLink(
                    "Community Templates",
                    "/settings/community/community-templates",
                ).access(_perm.is("editProject")).data,
                _subLink("Builders", "/settings/community/builders").access(
                    _perm.is("viewBuilders"),
                ).data,
            ]).data,
        ]),
    ]),
    _module("Sales", "orders", "GND Sales", [
        _section(null, null, [
            _link("Sales Dashboard", "dashboard", "/sales-dashboard").access(
                _role.is("Super Admin"),
            ).data,
        ]),
        _section(null, null, [
            _link("My Dashboard", "dashboard", "/sales-rep")
                .access(
                    _perm.is("editOrders"),
                    // _role.in("Admin", "Super Admin"),
                )
                .level(1).data,
            _link("Accounting", "billing", "/sales-book/accounting").access(
                _perm.is("editSales"),
            ).data,
            _link("Product Report", "report", "/product-report").access(
                _role.in("Super Admin"),
            ).data,
            // .childPaths("sales-book/accounting/resolution-center").data,
            _link(
                "Accounting Resolution",
                "resolutionCenter",
                "/sales-book/accounting/resolution-center",
            ).access(_perm.is("editSalesResolution")).data,
            // .childPaths("sales-book/accounting/resolution-center").data,
        ]),
        _section("main", null, [
            // _link("HOME", "project", "/sales-book/home-page").access(
            //     _perm.in("editOrders"),
            // ).data,

            _link("Sales", "orders", "/sales-book/orders", [
                _subLink("Bin", "/sales-book/orders/bin").access(
                    _role.is("Super Admin"),
                ).data,
            ])
                .access(_perm.is("editOrders"))
                .childPaths(
                    "sales-book/create-order",
                    "sales-book/edit-order",
                    // "sales-book/orders/sales-statistics",
                ).data,
            _link("Quotes", "estimates", "/sales-book/quotes")
                .access(_perm.is("viewEstimates"))
                .childPaths("sales-book/create-quote", "sales-book/edit-quote")
                .data,
            // .childPaths("sales-book/create-quote", "sales-book/edit-quote")
            // _link("Inventory", "inbound", "/inventory", [
            //     _subLink("Inventory", "/inventory").data,
            //     _subLink("Inbounds", "/inventory/inbounds").data,
            //     _subLink("Stock Movements", "/inventory/stocks").data,
            //     _subLink("Categories", "/inventory/categories").data,
            //     _subLink("Imports", "/inventory/imports").data,
            //     _subLink("Inbound Management", "/sales-book/inbound-management")
            //         .data,
            // ]).access(_role.is("Super Admin")).data,
            _link(
                "Inbounds Managment",
                "inbound",
                "/sales-book/inbound-management",
            ).access(_perm.is("viewInboundOrder")).data,
            // _link("Dispatch", "estimates", "/sales-books/quotes").access(
            //     _perm.is("editOrders"),
            // ).data,
        ]),
        _section("", "", [
            _link(
                "Productions",
                "production",
                "/sales-book/productions",
            ).access(_perm.is("editOrders")).data,
            _link("Dispatch", "delivery2", "/sales-books/quotes", [
                _subLink("Dispatch Task", "/sales-book/dispatch-task").access(
                    _perm.is("editDelivery"),
                    _perm.isNot("editOrders"),
                ).data,
                _subLink("Delivery", "/sales-book/dispatch").access(
                    _perm.is("editDelivery"),
                    _perm.is("editOrders"),
                ).data,
                _subLink("Pickup", "/sales-book/pickups").access(
                    _perm.is("editPickup"),
                ).data,
            ]).access(_perm.is("editOrders")).data,
        ]),
        _section("", "", [
            _link("Customers", "user", "/sales-book/customers").access(
                _perm.in("editSalesCustomers", "viewOrders"),
            ).data,
            _link("Dealers", "user", "/sales-book/dealers").access(
                _role.is("Super Admin"),
            ).data,
        ]),
    ]),
    _module("Inventory", "packingList", "GND Inventory", [
        _section("main", null, [
            _link("Inventory", "inbound", "/inventory", [
                _subLink("Inventory", "/inventory").data,
                _subLink("Inbounds", "/inventory/inbounds").data,
                _subLink("Stock Movements", "/inventory/stocks").data,
                _subLink("Categories", "/inventory/categories").data,
                _subLink("Imports", "/inventory/imports").data,
                _subLink("Inbound Management", "/sales-book/inbound-management")
                    .data,
            ]).access(_role.is("Super Admin")).data,
            // _link(
            //     "Inbounds Managment",
            //     "inbound",
            //     "/sales-book/inbound-management",
            // ).access(_perm.is("viewInboundOrder")).data,
            // _link("Dispatch", "estimates", "/sales-books/quotes").access(
            //     _perm.is("editOrders"),
            // ).data,
        ]),
    ]),
    _module("" as any, null, "", [profileSection]),
];
export function getLinkModules(_linkModules = linkModules) {
    let i = {
        section: 0,
        links: 0,
        subLinks: 0,
    };
    const moduleMap: {} = {};
    const linksNameMap: {
        [href in string]: {
            name?: string;
            module?: string;
            match?: "part";
        };
    } = {};
    let __defaultLink = null;
    let __rankedLinks: { rank: number; href: string }[] = [];
    const modules = _linkModules.map((m, mi) => {
        let rankedLinks: { rank: number; href: string }[] = [];
        let defaultLink = null;
        m.index = mi;
        let moduleLinks = 0;
        m.sections = m.sections.map((s, si) => {
            let sectionLinks = 0;
            s.index = si;
            s.globalIndex = i.section++;
            // i.section += 1;
            s.links = s.links.map((l, li) => {
                if (l.show) {
                    if (l.href) {
                        linksNameMap[l.href] = {
                            name: l.name,
                            module: m.name,
                        };
                        if (!defaultLink) defaultLink = l.href;
                        if (l.level)
                            rankedLinks.push({
                                rank: l.level,
                                href: l.href,
                            });
                    }
                    l.index = li;
                    l.globalIndex = i.links++;
                    sectionLinks++;
                    moduleLinks++;
                    l?.paths?.map((p) => {
                        linksNameMap[p] = {
                            name: l.name,
                            module: m.name,
                            match: "part",
                        };
                    });
                }
                if (l?.subLinks?.length)
                    l.subLinks = l.subLinks.map((sl, sli) => {
                        if (sl.href && sl.show) {
                            if (!defaultLink) defaultLink = sl.href;
                            if (sl.level)
                                rankedLinks.push({
                                    rank: sl.level,
                                    href: sl.href,
                                });
                            linksNameMap[sl.href] = {
                                name: l.name,
                                module: m.name,
                            };
                        }
                        return sl;
                    });
                return l;
            });
            s.linksCount = sectionLinks;
            return s;
        });
        m.activeLinkCount = moduleLinks;
        __rankedLinks.push(...rankedLinks);
        m.defaultLink = defaultLink;
        if (!__defaultLink) __defaultLink = defaultLink;
        return m;
    });
    let renderMode: "default" | "suppressed" | "none" = "suppressed";
    const moduleLinksCount = sum(modules, "activeLinkCount");

    if (moduleLinksCount > 12) renderMode = "default";
    if (moduleLinksCount < 6) renderMode = "none";
    if (__rankedLinks?.length) {
        __defaultLink = __rankedLinks.sort((a, b) => a.rank - b.rank)?.[0]
            ?.href;
    }
    const totalLinks = sum(modules, "activeLinkCount");
    const noSidebar = totalLinks < 5;
    return {
        modules,
        renderMode,
        linksNameMap,
        moduleLinksCount,
        defaultLink: __defaultLink,
        totalLinks,
        noSidebar,
    };
}
