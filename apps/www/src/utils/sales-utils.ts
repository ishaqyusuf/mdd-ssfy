import {
	AddressBookMeta,
	CustomerMeta,
	QtyControlType,
	SalesStatStatus,
} from "@/app-deps/(clean-code)/(sales)/types";
import { Prisma } from "@/db";
import dayjs from "dayjs";

export const salesFormUrl = (type, slug?, isDyke = true) => {
	if (isDyke)
		return `/sales-book/${slug ? `edit-${type}` : `create-${type}`}${
			slug ? `/${slug}` : ""
		}`;
	return `/sales/edit/${slug}/${slug || "new"}`;
};

// const date = dayjs().
export function composeSalesStat(stats: Prisma.SalesStatGetPayload<{}>[]) {
	const statDateCheck = stats.map((stat) => {
		const isValid = dayjs(stat.createdAt).isAfter(dayjs("2025-04-15"), "days");
		return {
			isValid,
		};
	});
	let validStat = statDateCheck.every((a) => a.isValid);
	const _stat: { [id in QtyControlType]: (typeof stats)[number] } = {} as any;
	stats.map((s) => (_stat[s.type] = s));
	return {
		isValid: validStat,
		..._stat,
	};
}
export function qtyControlsByType(controls: Prisma.QtyControlGetPayload<{}>[]) {
	const _stat: { [id in QtyControlType]: (typeof controls)[number] } =
		{} as any;
	controls.map((c) => (_stat[c.type] = c));
	return _stat;
}
export function productionStatus(qty, completed): SalesStatStatus {
	if (!qty) return "unknown";
	if (completed == 0) return "pending";
	if (qty == completed) return "completed";
	if (qty > completed && completed > 0) return "in progress";
}

export function salesAddressLines(
	address: Prisma.AddressBooksGetPayload<{}>,
	customer?: Prisma.CustomersGetPayload<{}>,
) {
	let meta = address?.meta as any as AddressBookMeta;
	let cMeta = customer?.meta as any as CustomerMeta;
	return [
		address?.name || customer?.name || customer?.businessName,
		address?.phoneNo || customer?.phoneNo || customer?.phoneNo2,
		address?.email || customer?.email,
		address?.address1 || customer?.address,
		address?.address2,
		[address?.city, address?.state, meta?.zip_code, address?.country]
			?.filter(Boolean)
			?.join(", "),
	].filter(Boolean);
}
export function squareSalesNote(orderIds: string[]) {
	return `sales payment for order${
		orderIds.length > 1 ? "s" : ""
	} ${orderIds.join(", ")}`;
}

export function payrollUid(oid, pid, submissionId) {
	return Object.entries({ oid, pid, submissionId })
		.filter(([a, b]) => !!b)
		.map(([a, b]) => `${a}:${b}`)
		.join(",");
}
export function laborRate(rate, override) {
	return override ?? (override === 0 ? 0 : rate);
}
