import type { ICan, PermissionScope } from "@/types/auth";
import type z from "zod";

import { sum } from "@/lib/utils";
import type { IconKeys } from "@gnd/ui/icons";
import type { schema } from "./context";
// import va from "@/lib/va";

type moduleNames = "" | "HRM" | "Sales" | "Community" | "Inventory" | null;
const _module = (
	name: moduleNames,
	icon: IconKeys | null,
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
// type sectionNames = "" | "sales";
export type LinkItem = {
	name;
	title;
	href?;
	paths?: string[];
	level?;
	show?: boolean;
	meta?: boolean;
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
		subLinks(...subLinks: LinkItem[]) {
			res.subLinks = subLinks;
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

// type Role = "Admin" | "Production" | "1099 Contractor" | "Super Admin";
type Role =
	| "Production"
	| "Admin"
	| "1099 Contractor"
	| "Production"
	| "Deco Shutters"
	| "Super Admin"
	| "Punchout";
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
export function validateRules(accessList: Access[], can?, userId?, _role?) {
	const permissionMap = can ?? {};
	const role = typeof _role === "string" ? _role : _role?.name;
	return accessList.every((a) => {
		switch (a.type) {
			// case "userId":
			//     return Number(a.values[0]) == userId;
			//     break;
			case "permission":
				switch (a.equator) {
					case "every":
					case "is":
						return a.values?.every((p) => permissionMap?.[p]);
					case "in":
					case "some":
						return a.values?.some((p) => permissionMap?.[p]);
					case "isNot":
					case "notIn":
						return a.values.every((p) => !permissionMap?.[p]);
				}
				return true;
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
				return true;
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
				// lnk.show = valid;
				// if(!valid)return
				if (lnk.subLinks?.length)
					lnk.subLinks = lnk.subLinks.map((sl) => {
						sl.show = validateAccess([
							...(lnk.access ?? []),
							...(sl.access ?? []),
						]);
						return sl;
					});
				lnk.show =
					lnk.subLinks?.length && !lnk.href && !lnk?.access?.length
						? lnk.subLinks.filter((a) => !a.meta)?.some((a) => a.show)
						: valid && !!lnk.access?.length;
				// if (
				//     !lnk?.access?.length &&
				//     lnk.subLinks?.length &&
				//     lnk?.subLinks?.filter((a) => !a.meta)?.every((s) => !s.show)
				// )
				//     lnk.show = false;

				return lnk;
			});

			return s;
		});
		return lm;
	});
};
type NavType = z.infer<typeof schema>;
const profileSection = _section("settings", null, [
	_link("Profile Settings", "settings2", "/settings/profile").access(
		_role.some("Admin", "Production", "1099 Contractor", "Super Admin"),
	).data,
	_link("Task Events", "tasks", "/task-events")
		.access(_role.is("Super Admin"))
		.childPaths("/task-events/").data,
	_link("Site Actions", "Notification", "/site-actions").access(
		_role.is("Super Admin"),
	).data,
	_link(
		"Notification Channels",
		"notification",
		"/settings/notification-channels/v2",
	).access(_role.is("Super Admin")).data,
]);

const canEditProject = _perm.in("editProject", "editCommunity");
const canViewCommunityUnits = _perm.in(
	"editProject",
	"editCommunity",
	"viewCommunity",
	"viewCommunityUnit",
	"editCommunityUnit",
);
const isDev = process.env.NODE_ENV !== "production";
export const linkModules = [
	_module("Sales", "salesDashboard", "GND Sales", [
		_section(null, null, [
			_link("Sales Dashboard", "salesDashboard", "/sales-dashboard").access(
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
			_link("Accounting", "accounting", "/sales-book/accounting").access(
				_perm.in("viewOrderPayment", "editOrderPayment", "editSales"),
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
		_section("", null, [
			// _link("HOME", "project", "/sales-book/home-page").access(
			//     _perm.in("editOrders"),
			// ).data,

			_link("Sales", "orders", "/sales-book/orders", [
				_subLink("Bin", "/sales-book/orders/bin").access(
					_role.is("Super Admin"),
				).data,
				_subLink("Orders V2", "/sales-book/orders/v2").access(
					_role.is("Super Admin"),
				).data,
				_subLink("Create Order", "/sales-book/create-order").data, //.access(_role.is("Super Admin")).data,
				_subLink("Create Quote", "/sales-book/create-quote").data, //.access(_role.is("Super Admin")).data,
				_subLink(
					"Create Order (Experimental)",
					"/sales-form/create-order",
				).access(_role.is("Super Admin")).data,
				_subLink(
					"Create Quote  (Experimental)",
					"/sales-form/create-quote",
				).access(_role.is("Super Admin")).data,
			])
				.access(_perm.is("editOrders"))
				.childPaths(
					"sales-book/create-order",
					"sales-book/edit-order",
					"sales-book/edit-order/slug",
					"sales-form/create-order",
					"sales-form/edit-order",
					"sales-form/edit-order/slug",
					// "sales-book/orders/sales-statistics",
				).data,
			_link("Quotes", "quotes", "/sales-book/quotes")
				.access(_perm.is("viewEstimates"))
				.childPaths(
					"sales-book/create-quote",
					"sales-book/edit-quote",
					"sales-book/edit-quote/slug",
					"sales-form/create-quote",
					"sales-form/edit-quote",
					"sales-form/edit-quote/slug",
				).data,
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
			_link("Productions", "production", "/sales-book/productions", [
				_subLink("Productions v2", "/sales-book/productions/v2").access(
					_perm.is("editOrders"),
				).data,
			])
				.access(_perm.is("editOrders"))
				.childPaths("/sales-book/productions/v2").data,
			_link("Packing List", "pickup", "/sales/packing-list").access(
				// _perm.is("viewPacking"),
				_role.is("Super Admin"),
			).data,
			_link("Dispatch", "dispatch", "/sales-book/dispatch-admin", [
				_subLink("Dispatch Task", "/sales-book/dispatch-task").access(
					_perm.is("editDelivery"),
					_perm.isNot("viewOrders"),
					_role.isNot("Super Admin"),
				).data,
				// _subLink("Delivery", "/sales-book/dispatch").access(
				//     _perm.is("editDelivery"),
				//     _perm.is("editOrders"),
				// ).data,
				// _subLink("Pickup", "/sales-book/pickups").access(
				//     _perm.is("editPickup"),
				// ).data,
				_subLink("Delivery V2", "/sales-book/dispatch/v2").access(
					_role.is("Super Admin"),
				).data,
				_subLink("Admin Dashboard", "/sales-book/dispatch-admin").access(
					_role.is("Super Admin"),
				).data,
			]).access(_perm.is("editOrders")).data,
		]),
		_section("", "", [
			_link("Customers", "customers", "/sales-book/customers", [
				_subLink("Customers v2", "/sales-book/customers/v2").access(
					_role.is("Super Admin"),
				).data,
			])
				.access(_perm.in("editSalesCustomers", "viewOrders"))
				.childPaths("/sales-book/customers/v2").data,
			_link("Dealers", "user", "/sales-book/dealers").access(
				_role.is("Super Admin"),
			).data,
		]),
	]),
	_module("HRM", "employees", "GND HRM", [
		_section("", null, [
			// _link("HRM", "hrm", "/").access(_perm.in("viewHrm")).data,
			_link("Employees", "employees", "/hrm/employees")
				.access(_perm.some("viewHrm", "viewEmployee"))
				.subLinks(
					// .access(
					//     // _role.is("Super Admin"),
					// )
					_subLink("Employees - v2", "/hrm/employees/v2").data,
				).data,
			_link(
				"Document Approvals",
				"documentApproval",
				"/hrm/document-approvals",
			).access(
				// _role.is("Super Admin")
				_perm.some("editEmployeeDocument"),
			).data,
			// _link("Profile", "profile", "/hrm/profiles").access(
			//     _perm.some("viewHrm", "viewEmployee"),
			// ).data,
			// _link("Roles", "roles", "/hrm/roles").access(_perm.some("viewRole"))
			//     .data,
		]),
		_section("", null, [
			_link("Jobs", "jobs", "/contractor/jobs")
				.access(_perm.every("viewProject", "viewInvoice", "viewJobs"))
				.subLinks(
					_subLink("Jobs - v2", "/hrm/contractors/jobs").access(
						// _role.is("Super Admin"),
						_perm.every("viewProject", "viewInvoice", "viewJobs"),
					).data,
				).data,
			_link(
				"Payment Dashboard",
				"payment",
				"/contractors/jobs/payment-dashboard",
			)
				.access(_perm.every("viewProject", "viewInvoice", "viewJobPayment"))
				.subLinks(
					_subLink(
						"Payment Dashboard",
						"/contractors/jobs/payment-dashboard",
					).access(_perm.every("viewProject", "viewInvoice", "viewJobPayment"))
						.data,
					_subLink("Payment Portal", "/contractors/jobs/payment-portal").access(
						_perm.every("viewProject", "viewInvoice", "viewJobPayment"),
					).data,
					_subLink("Payments", "/contractors/jobs/payments").access(
						_perm.every("viewProject", "viewInvoice", "viewJobPayment"),
					).data,
				)
				.childPaths(
					"/contractors/jobs/payment-dashboard",
					"/contractors/jobs/payment-portal",
					"/contractors/jobs/payments",
				).data,
		]),
		// profileSection,
	]),
	_module(null, null, null, [
		_section("", null, [
			_link("Dashboard", "dashboard", "/production/dashboard", [
				_subLink("Production Dashboard v2", "/production/dashboard/v2").access(
					_role.is("Production"),
				).data,
			]).access(_role.is("Production")).data,
		]),
	]),
	_module("Community", "project", "GND Community", [
		_section("", null, [
			// _link("Dashboard", "dashbord2", "/community").access(canEditProject)
			// .data,
			_link("Projects", "project", "/community/projects").access(
				canViewCommunityUnits,
			).data,
			_link("Units", "home", "/community/project-units").access(
				canViewCommunityUnits,
			).data,
			_link("Productions", "production", "/community/unit-productions").access(
				_perm.in("editCommunity", "editProduction"),
			).data,
			_link("Invoices", "invoice", "/community/unit-invoices").access(
				_perm.in("viewInvoice"),
			).data,
			_link("Templates", "template", "/community/templates")
				.access(canViewCommunityUnits)
				.childPaths(
					"/settings/community/community-template/slug",
					"/community/community-template/slug",
					"/community/community-template/slug/v1",
					"/community/model-template/slug",
					"/community/template-schema",
				).data,
			_link("Builders", "builder", "/community/builders").access(
				_perm.in("editCommunity", "viewBuilders"),
			).data,
			_link("Install Costs", "installCosts", "/community/install-costs").access(
				canEditProject,
			).data,
		]),
		_section("", null, [
			_link(
				"Customer Service",
				"customerService",
				"/community/customer-services",
				// "/customer-services"
			)
				.access(_perm.is("viewCustomerService"))
				.level(7).data,
		]),

		_section("", null, [
			_link("Production Dashboard", "production", "/production/dashboard", [
				_subLink("Production Dashboard v2", "/production/dashboard/v2").access(
					_role.is("Production"),
				).data,
			])
				.access(_role.is("Production"))
				.childPaths("/production/dashboard/v2").data,
			_link("Unit Production", "production", "/tasks/unit-productions").access(
				_role.is("Production"),
			).data,
			// _link("Installations", "tasks", "/tasks/installations").access(
			// 	_role.is("1099 Contractor"),
			// 	_perm.is("viewInstallation"),
			// ).data,
			// _link("Payments", "payment", "/payments").access(
			// 	_role.is("1099 Contractor"),
			// 	_perm.is("viewInstallation"),
			// ).data,

			// _link("Punchout", "punchout", "/jobs/punchouts").access(
			// 	_role.isNot("Admin"),
			// 	_perm.is("viewTech"),
			// ).data,
			// _link("Payments", "payment", "/payments").access(
			// 	_role.isNot("Admin"),
			// 	_perm.is("viewTech"),
			// ).data,
			// _link("Installations", "tasks", "/jobs/installations").access(
			// 	_role.isNot("Admin"),
			// 	_perm.is("viewDecoShutterInstall"),
			// ).data,
			// _link("Payments", "payment", "/payments").access(
			// 	_role.isNot("Admin"),
			// 	_perm.is("viewDecoShutterInstall"),
			// ).data,
			_link("Job Dashboard", "tasks", "/jobs-dashboard")
				.access(_role.in("1099 Contractor", "Punchout", "Deco Shutters"))
				.childPaths("/jobs-dashboard/payments", "/jobs-dashboard/jobs-list")
				.data,
			_link("Sales Commission", "percent", "/sales/commissions").access(
				_perm.is("viewCommission"),
			).data,
		]),
	]),

	...(isDev
		? [
				_module("Inventory", "products", "GND Inventory", [
					_section("", null, [
						_link("Inventory", "inbound", "/inventory", [
							_subLink("Create Inventory", "/inventory?productId=-1").data,
						]).access(_role.is("Super Admin")).data,
						_link("Components", "products", "/inventory/components", [
							_subLink("Create Component", "/inventory/components?productId=-1")
								.data,
						]).access(_role.is("Super Admin")).data,
						_link("Kind Review", "report", "/inventory/review").access(
							_role.is("Super Admin"),
						).data,
						_link("Inbounds", "inbound", "/inventory/inbounds").access(
							_role.is("Super Admin"),
						).data,
						_link("Allocations", "report", "/inventory/allocations").access(
							_role.is("Super Admin"),
						).data,
						_link("Stock Movements", "report", "/inventory/stocks").access(
							_role.is("Super Admin"),
						).data,
						_link("Suppliers", "products", "/inventory/suppliers").access(
							_role.is("Super Admin"),
						).data,
						_link("Categories", "products", "/inventory/categories").access(
							_role.is("Super Admin"),
						).data,
						_link("Imports", "report", "/inventory/imports").access(
							_role.is("Super Admin"),
						).data,
						_link(
							"Inbound Management",
							"inbound",
							"/sales-book/inbound-management",
						).access(_role.is("Super Admin")).data,
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
			]
		: []),
	_module("", null, "", [
		profileSection,
		_section("Support", null, [
			_link("Mobile App", "mobileApp", "/settings/mobile-app").access(
				_role.is("Super Admin"),
			).data,
		]),
	]),
];
export function getLinkModules(_linkModules = linkModules) {
	const i = {
		section: 0,
		links: 0,
		subLinks: 0,
	};
	const moduleMap: Record<string, unknown> = {};
	const linksNameMap: {
		[href in string]: {
			name?: string;
			module?: string;
			match?: "part";
			hasAccess?: boolean;
		};
	} = {};
	let __defaultLink = null;
	const __rankedLinks: { rank: number; href: string }[] = [];
	const modules = _linkModules.map((m, mi) => {
		const rankedLinks: { rank: number; href: string }[] = [];
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
							hasAccess: l.show,
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
				}
				if (l.href) {
					linksNameMap[l.href] = {
						name: l.name,
						module: m.name,
						hasAccess: l.show,
					};
				}
				l?.paths?.map((p) => {
					linksNameMap[p] = {
						name: l.name,
						module: m.name,
						match: "part",
						hasAccess: l.show,
					};
				});

				if (l?.subLinks?.length)
					l.subLinks = l.subLinks.map((sl, sli) => {
						if (sl.href && sl.show) {
							if (!defaultLink) defaultLink = sl.href;
							if (sl.level)
								rankedLinks.push({
									rank: sl.level,
									href: sl.href,
								});
						}
						linksNameMap[sl.href] = {
							name: l.name,
							module: m.name,
							hasAccess: sl.show,
						};
						sl?.paths?.map((p) => {
							linksNameMap[p] = {
								name: sl.name ?? l.name,
								module: m.name,
								match: "part",
								hasAccess: sl.show,
							};
						});
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
		__defaultLink = __rankedLinks.sort((a, b) => a.rank - b.rank)?.[0]?.href;
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

export function getActiveLinkFromMap(
	pathName: string | null | undefined,
	linksNameMap: ReturnType<typeof getLinkModules>["linksNameMap"],
) {
	const normalizedPath = pathName?.toLocaleLowerCase();
	if (!normalizedPath) return undefined;

	const exactMatch = Object.entries(linksNameMap || {}).find(
		([href]) => href?.toLocaleLowerCase() === normalizedPath,
	)?.[1];
	if (exactMatch) return exactMatch;

	return Object.entries(linksNameMap || {})
		.filter(
			([href, data]) =>
				data.match === "part" &&
				normalizedPath.startsWith(href?.toLocaleLowerCase()),
		)
		.sort(([hrefA], [hrefB]) => hrefB.length - hrefA.length)?.[0]?.[1];
}
