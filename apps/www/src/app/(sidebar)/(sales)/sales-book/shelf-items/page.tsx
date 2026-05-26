import PageShell from "@/components/page-shell";
import { ShelfItemsManager } from "@/components/sales-book/shelf-items-manager";

export default function Page() {
    return (
        <PageShell>
            <ShelfItemsManager />
        </PageShell>
    );
}
