import { Icons } from "@/components/_v1/icons";
import { useCustomerReportCtx } from "../report-ctx";
import Money from "@/components/_v1/money";

export default function Header() {
    const data = useCustomerReportCtx();
    return (
        <>
            <thead id="topHeader">
                <tr className="">
                    <td colSpan={16} className="">
                        <table className="w-full text-xs">
                            <tbody className="">
                                <tr className="">
                                    <td colSpan={6} valign="top">
                                        <Icons.PrintLogo />
                                    </td>
                                    <td valign="top" align="center" colSpan={5}>
                                        <div className="text-xs font-semibold text-black/90">
                                            <p>13285 SW 131 ST</p>
                                            <p>Miami, Fl 33186</p>
                                            <p>Phone: 305-278-6555</p>

                                            <p>support@gndmillwork.com</p>
                                        </div>
                                    </td>
                                    <td
                                        valign="top"
                                        align="right"
                                        className=""
                                        colSpan={5}
                                    >
                                        <p className="text-black mb-1 text-end text-xl font-bold capitalize">
                                            Statement
                                        </p>
                                        <p className="text-sm">{data.date}</p>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </td>
                </tr>
                <tr className="">
                    <td colSpan={16} className="pt-10">
                        <table className="w-full text-xs">
                            <tbody className="">
                                <tr className="">
                                    <td colSpan={6} className="">
                                        <table className="w-full" id="customer">
                                            <thead>
                                                <th
                                                    align="left"
                                                    className="px-2"
                                                >
                                                    To:
                                                </th>
                                            </thead>
                                            <tbody>
                                                {data.customer.map((c) => (
                                                    <tr key={c}>
                                                        <td>{c}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </td>
                                    <td colSpan={6}></td>
                                    <td colSpan={4} align="right">
                                        <table
                                            id="subHeader"
                                            className="w-full"
                                        >
                                            <thead>
                                                <th colSpan={1}>Amount Due</th>
                                                <th colSpan={1}>Amount Enc</th>
                                            </thead>
                                            <tbody>
                                                <tr>
                                                    <td align="center">
                                                        <Money
                                                            value={
                                                                data
                                                                    .reportFooter
                                                                    .current
                                                            }
                                                        />
                                                    </td>
                                                    <td></td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </td>
                </tr>
            </thead>
        </>
    );
}
