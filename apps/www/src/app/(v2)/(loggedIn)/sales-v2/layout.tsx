import CustomerMerger from "./_components/customer-merger";

export default function SalesLayout({ children }) {
    return (
        <>
            <CustomerMerger />
            {children}
        </>
    );
}
