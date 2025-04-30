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
type linkNames = "HRM" | "customer-services";
const _link = (
    name: linkNames,
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
type Can = "Admin" | "Production";
const _role = {
    is: (role: Role) => __access("role", "is", role),
    isNot: (role: Role) => __access("role", "isNot", role),
    in: (...roles: Role[]) => __access("role", "in", ...roles),
    notIn: (...roles: Role[]) => __access("role", "notIn", ...roles),
    every: (...roles: Role[]) => __access("role", "every", ...roles),
    some: (...roles: Role[]) => __access("role", "some", ...roles),
};
const _can = {
    is: (role: Can) => __access("permission", "is", role),
    isNot: (role: Can) => __access("permission", "isNot", role),
    in: (...roles: Can[]) => __access("permission", "in", ...roles),
    notIn: (...roles: Can[]) => __access("permission", "notIn", ...roles),
    every: (...roles: Can[]) => __access("permission", "every", ...roles),
    some: (...roles: Can[]) => __access("permission", "some", ...roles),
};

export const linkModules = [
    _module("HRM", "hrm", "GND HRM", [
        _section("main", null, [
            _link("HRM", "hrm", "/").access(_can.in("Admin")).data,
        ]),
    ]),
    _module("Sales", "orders", "GND Sales", []),
];
