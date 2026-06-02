import { SalesNav } from "@/components/sales-nav";
import { SalesTabs } from "@/components/sales-tabs";

export default async function Layout({ children }) {
    return (
        <>
            {children}
            <SalesNav />
            {/* <SalesTabs /> */}
        </>
    );
}
