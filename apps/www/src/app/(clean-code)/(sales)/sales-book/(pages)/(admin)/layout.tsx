import PagesTab from "@/app-deps/(clean-code)/(sales)/sales-book/(pages)/_components/pages-tab";

export default async function Layout({ children }) {
    return (
        <>
            <PagesTab />
            {children}
        </>
    );
}
