import { SalesPreviewModal } from "@/components/modals/sales-preview-modal";
import PagesTab from "../_components/pages-tab";

export default async function Layout({ children }) {
    return (
        <>
            <PagesTab />
            {children}
        </>
    );
}
