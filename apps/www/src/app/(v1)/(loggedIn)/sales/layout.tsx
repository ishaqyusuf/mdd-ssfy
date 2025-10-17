import CustomerMerger from "@/app/(v2)/(loggedIn)/sales-v2/_components/customer-merger";

export default function SalesLayout({ children }) {
    return (
        <>
            <CustomerMerger />
            {children}
        </>
    );
}
