import PagesTab from "../_components/pages-tab";

export default async function Layout({ children }) {
    return (
        <>
            <PagesTab />
            {children}
        </>
    );
}
