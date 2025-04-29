import Note from "@/modules/notes";
import { salesOverviewStore } from "../store";
import { noteTagFilter } from "@/modules/notes/utils";

export function SalesNoteTab({}) {
    const store = salesOverviewStore();
    return (
        <div>
            <Note
                subject={"Production Note"}
                headline=""
                statusFilters={["public"]}
                typeFilters={["production", "general"]}
                tagFilters={[noteTagFilter("salesId", store.salesId)]}
            />
        </div>
    );
}
