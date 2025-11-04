import { SalesNav } from "@/components/sales-nav";

export default async function Layout({ children }) {
    return (
        <>
            {children}
            <SalesNav />
        </>
    );
}
