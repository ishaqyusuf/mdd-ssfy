import { Metadata } from "next";
import {
    SalesQueryParams,
    getSalesAction,
} from "@/app-deps/(v2)/(loggedIn)/sales/dashboard/_actions/get-sales-action";
import FPage from "@/components/(clean-code)/fikr-ui/f-page";
import PageClient from "@/app-deps/(v2)/(loggedIn)/sales/dashboard/_components/page-client";
import ServerTab from "@/app-deps/(v2)/(loggedIn)/sales/dashboard/_components/server-tab";

export const metadata: Metadata = {
    title: "Sales",
};
export type SalesPageType =
    | "orders"
    | "delivery"
    | "pickup"
    | "quotes"
    | "productions";
interface Props {
    searchParams: Promise<SalesQueryParams>;
    params: Promise<{ type: SalesPageType }>;
}
export default async function SalesPage(props: Props) {
    const searchParams = await props.searchParams;
    const promise = getSalesAction({
        ...searchParams,
        type: "order",
        deliveryOption: "pickup",
    });

    return (
        <FPage title="Pickup">
            <PageClient type="pickup" response={promise} />
        </FPage>
    );
}
