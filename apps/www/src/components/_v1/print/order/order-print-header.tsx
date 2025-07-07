"use client";

import { useAppSelector } from "@/store";
import { formatDate } from "@/lib/use-day";
import { IAddressBook, ISalesOrder } from "@/types/sales";

interface Props {
    order: ISalesOrder;
    // onImageLoaded?
    Logo;
}
export function OrderPrintHeader({ order, Logo }: Props) {
    const po = useAppSelector((state) => state.slicers.printOrders);

    return (
        <thead id="topHeader">
            <tr>
                <td colSpan={15}>
                    <table className="w-full  table-fixed text-xs">
                        <tbody>
                            <tr>
                                <td className="" valign="top" colSpan={9}>
                                    <Logo />
                                </td>
                                <td valign="top" colSpan={5}>
                                    <div className="text-xs font-semibold text-black/90">
                                        <p>13285 SW 131 ST</p>
                                        <p>Miami, Fl 33186</p>
                                        <p>Phone: 305-278-6555</p>
                                        {po?.mode == "production" && (
                                            <p>Fax: 305-278-2003</p>
                                        )}
                                        <p>support@gndmillwork.com</p>
                                    </div>
                                </td>
                                {order?.id && (
                                    <>
                                        <td colSpan={1}></td>
                                        <td valign="top" colSpan={9}>
                                            <div className="flex justify-end"></div>
                                            <p className="text-black mb-2 text-end text-xl font-bold capitalize">
                                                {po?.mode}
                                            </p>
                                            <table className="w-full table-fixed">
                                                <tbody>
                                                    <Info1Line
                                                        label={`${
                                                            po?.mode == "quote"
                                                                ? "Quote #"
                                                                : "Order #"
                                                        }`}
                                                        value={
                                                            <span className="text-sm font-bold">
                                                                {order.orderId}
                                                            </span>
                                                        }
                                                    />
                                                    <Info1Line
                                                        label={`${
                                                            po?.mode == "quote"
                                                                ? "Quote Date"
                                                                : "Order Date"
                                                        }`}
                                                        value={formatDate(
                                                            order.createdAt
                                                        )}
                                                    />
                                                    {po?.isProd && (
                                                        <Info1Line
                                                            label="Due Date"
                                                            value={
                                                                formatDate(
                                                                    order.prodDueDate
                                                                ) || "-"
                                                            }
                                                        />
                                                    )}
                                                </tbody>
                                            </table>
                                            <table className="text-fixed w-full">
                                                <tbody>
                                                    <InfoLine
                                                        label="Rep."
                                                        value={
                                                            order?.salesRep
                                                                ?.name
                                                        }
                                                    />
                                                    {po?.showInvoice && (
                                                        <>
                                                            {
                                                                <InfoLine
                                                                    label={
                                                                        order?.type ==
                                                                        "order"
                                                                            ? "Due Date"
                                                                            : "Good Until"
                                                                    }
                                                                    value={formatDate(
                                                                        order?.goodUntil
                                                                    )}
                                                                />
                                                            }
                                                            <InfoLine
                                                                label="P.O No."
                                                                value={
                                                                    order?.meta
                                                                        ?.po
                                                                }
                                                            />
                                                            {(order?.amountDue ||
                                                                0) > 0 ? (
                                                                <InfoLine
                                                                    label="Amount Due"
                                                                    value={
                                                                        <span className="font-medium">
                                                                            {(order?.amountDue ||
                                                                                0) >
                                                                            0
                                                                                ? `$${order?.amountDue}`
                                                                                : "-"}
                                                                        </span>
                                                                    }
                                                                />
                                                            ) : (
                                                                <InfoLine
                                                                    label="Invoice Status"
                                                                    value={
                                                                        "Paid"
                                                                    }
                                                                />
                                                            )}
                                                        </>
                                                    )}
                                                </tbody>
                                            </table>
                                        </td>
                                    </>
                                )}
                            </tr>
                            {order?.id && (
                                <tr>
                                    <Address
                                        businessName={
                                            order.customer?.businessName
                                        }
                                        address={order.billingAddress}
                                        title="Sold To"
                                    />
                                    <td colSpan={1} />
                                    <Address
                                        businessName={
                                            order.customer?.businessName
                                        }
                                        address={order.shippingAddress}
                                        title="Ship To"
                                    />
                                    <td colSpan={2} />
                                </tr>
                            )}
                        </tbody>
                    </table>
                </td>
            </tr>
        </thead>
    );
}
function InfoLine({ label, value }) {
    return (
        <tr className="">
            <td
                className="text-sm font-semibold leading-none  text-black/90"
                align="left"
            >
                {label}
            </td>
            <td
                className="font-black/60  whitespace-nowrap text-sm leading-none"
                align="right"
            >
                <div className="min-h-[16px]">{value}</div>
            </td>
        </tr>
    );
}
function Info1Line({ label, value }) {
    return (
        <tr>
            <td
                className="whitespace-nowrap text-sm font-semibold text-black/60"
                align="left"
            >
                {label}
            </td>
            <td className={`whitespace-nowrap leading-none`} align="right">
                <div className="min-h-[16px]">{value}</div>
            </td>
        </tr>
    );
}
function Address({
    address,
    title,
    businessName,
}: {
    address: IAddressBook | undefined;
    title;
    businessName;
}) {
    const lines = [
        businessName || address?.name,
        `${address?.phoneNo} ${
            address?.phoneNo2 ? `(${address?.phoneNo2})` : ""
        }`,
        address?.email,
        address?.address1,
        [address?.city, address?.state, address?.meta?.zip_code]
            ?.filter(Boolean)
            ?.join(" "),
    ]?.filter(Boolean);

    return (
        <td colSpan={10}>
            <div className="my-4  mb-4 flex flex-col ">
                <div>
                    <span className="p-1 px-2 border border-b-0 border-gray-400 bg-slate-200 text-gray-700 text-sm  font-bold">
                        {title}
                    </span>
                </div>
                <div className="flex flex-col p-2 border border-gray-400">
                    {lines?.map((f, _) => {
                        return (
                            <p
                                key={_}
                                className="sline-clamp-2 text-sm font-medium"
                            >
                                {f}
                            </p>
                        );
                    })}
                </div>
            </div>
            {/* lines: [name, phone_no, email, address_1, [city, state, zip_code].filter(Boolean).join(' ')].filter(Boolean), */}
        </td>
    );
}
