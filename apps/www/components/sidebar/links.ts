import { ICan, Permission } from "@/types/auth";

import { IconKeys } from "../_v1/icons";

type moduleNames = "HRM" | "Sales" | "Community";
const _module = (
    name: moduleNames,
    icon: IconKeys,
    // title?,
    subtitle?,
    sections = [],
) => ({
    name,
    icon,
    title: name,
    subtitle,
    sections,
});
type sectionNames = "main" | "sales";
type Link = {
    name;
    title;
    href?;
    links?: {
        name;
        link: string;
        title;
    }[];
};
const _section = (
    name: sectionNames,
    title?: string,
    links?: Link[],
    access: Access[] = [],
) => ({
    name,
    title,
    links,
    access,
});
// type linkNames = "HRM" | "customer-services" | "Dashboard" | "Sales";
const _subLink = (name, href, access?: Access[]) =>
    _link(name, null, href, access);
const _link = (
    name, //: linkNames,
    // title?: string,
    icon?: IconKeys,
    href?,
    subLinks = [],
    access: Access[] = [],
) => {
    const res = {
        name,
        title: name?.split("-").join(" "),
        icon,
        href,
        subLinks,
        access,
    };
    const ctx = {
        data: res,
        access(...access: Access[]) {
            res.access = access;
            return ctx;
        },
    };
    return ctx;
};
type Access = {
    type: "role" | "permission";
    equator: "is" | "isNot" | "in" | "notIn" | "every" | "some";
    values: string[];
};
const __access = (
    type: Access["type"],
    equator: Access["equator"],
    ...values
) => ({ type, equator, values }) as Access;

type Role = "Admin" | "Production";
const _role = {
    is: (role: Role) => __access("role", "is", role),
    isNot: (role: Role) => __access("role", "isNot", role),
    in: (...roles: Role[]) => __access("role", "in", ...roles),
    notIn: (...roles: Role[]) => __access("role", "notIn", ...roles),
    every: (...roles: Role[]) => __access("role", "every", ...roles),
    some: (...roles: Role[]) => __access("role", "some", ...roles),
};
const _perm = {
    is: (role: Permission) => __access("permission", "is", role),
    isNot: (role: Permission) => __access("permission", "isNot", role),
    in: (...roles: Permission[]) => __access("permission", "in", ...roles),
    notIn: (...roles: Permission[]) =>
        __access("permission", "notIn", ...roles),
    every: (...roles: Permission[]) =>
        __access("permission", "every", ...roles),
    some: (...roles: Permission[]) => __access("permission", "some", ...roles),
};

export const linkModules = [
    _module("HRM", "hrm", "GND HRM", [
        _section("main", null, [
            _link("HRM", "hrm", "/").access(_perm.in("viewHrm")).data,
        ]),
    ]),
    _module("Sales", "orders", "GND Sales", [
        _section("main", null, [
            _link("Dashboard", "dashboard", "/sales-rep").access(
                _perm.is("editOrders"),
            ).data,
            _link("Sales", "orders", "/sales-books/orders").access(
                _perm.is("editOrders"),
            ).data,
            _link("Quotes", "estimates", "/sales-books/quotes").access(
                _perm.is("editOrders"),
            ).data,
            _link("Productions", "estimates", "/sales-books/quotes").access(
                _perm.is("editOrders"),
            ).data,
            _link("Dispatch", "estimates", "/sales-books/quotes", [
                _subLink("Delivey", "/sales-book/dispatchs").access(
                    _perm.is("editDelivery"),
                ).data,
                _subLink("Pickup", "/sales-book/pickups").access(
                    _perm.is("editPickup"),
                ).data,
            ]).access(_perm.is("editOrders")).data,
            _link("Dispatch", "estimates", "/sales-books/quotes").access(
                _perm.is("editOrders"),
            ).data,
        ]),
    ]),
];
